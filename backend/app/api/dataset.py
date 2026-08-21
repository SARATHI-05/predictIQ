import io
import csv
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.database import get_db
from app.models.food_record import FoodRecord
from app.models.dataset_log import DatasetLog
from app.models.user import User
from app.utils.auth import get_current_user, require_admin
from app.utils.validators import validate_uploaded_dataset
from app.utils.audit import log_audit_event
from app.utils.notification_helper import create_notification
from app.utils.supabase_storage import upload_file_to_supabase_storage
from typing import Dict, Any, List


router = APIRouter(prefix="/api/dataset", tags=["Dataset"])

# Temporary in-memory cache for the latest upload's validation errors (for downloading error report)
_latest_validation_errors: List[Dict[str, Any]] = []

@router.post("/upload")
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Feature 5: Enhanced CSV/Excel upload with full data quality validation for both Admin and Staff.
    """
    global _latest_validation_errors
    filename = file.filename
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Allowed types: .csv, .xlsx, .xls"
        )

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed size (20MB)")

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )

    val_res = validate_uploaded_dataset(df)
    _latest_validation_errors = val_res.get('row_errors', [])

    clean_records = val_res.get('clean_records', [])
    total_rows = val_res.get('total_rows', 0)
    valid_rows = val_res.get('valid_rows', 0)
    invalid_rows = val_res.get('invalid_rows', 0)
    duplicate_rows = val_res.get('duplicate_rows', 0)

    if not clean_records and invalid_rows > 0:
        create_notification(
            db=db,
            type="UPLOAD",
            title="Dataset Upload Failed",
            message=f"Upload of '{filename}' by {current_user.name} ({current_user.role}) failed. All {total_rows} rows had validation errors.",
            severity="High"
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Dataset validation failed. No valid rows to import.",
                "total_rows": total_rows,
                "valid_rows": 0,
                "invalid_rows": invalid_rows,
                "duplicate_rows": duplicate_rows,
                "errors": [err['error_reasons'] for err in _latest_validation_errors[:10]]
            }
        )

    # Insert valid clean records into database without losing valid rows due to rejected rows
    new_records = []
    for rec in clean_records:
        rec_date = rec['date']
        if isinstance(rec_date, str):
            try:
                rec_date = datetime.strptime(rec_date[:10], "%Y-%m-%d").date()
            except Exception:
                rec_date = datetime.utcnow().date()

        new_records.append(FoodRecord(
            date=rec_date,
            food_category=rec['food_category'],
            food_prepared=rec['food_prepared'],
            food_consumed=rec['food_consumed'],
            leftover=rec['leftover'],
            expected_customers=rec['expected_customers'],
            holiday=rec['holiday'],
            special_event=rec['special_event'],
            weather=rec['weather']
        ))
    db.add_all(new_records)


    # Upload original raw file to Supabase Storage Bucket
    storage_url = upload_file_to_supabase_storage(
        bucket="predictiq-datasets",
        file_name=filename,
        file_content=content,
        content_type="text/csv" if filename.endswith(".csv") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    upload_status = "Success" if invalid_rows == 0 else f"Partial ({valid_rows} imported, {invalid_rows} rejected)"
    log = DatasetLog(
        filename=filename,
        rows_count=len(clean_records),
        uploaded_by=f"{current_user.name} ({current_user.role})",
        status=upload_status,
        storage_url=storage_url
    )

    db.add(log)
    db.commit()

    log_audit_event(
        db=db,
        action="DATASET_UPLOAD",
        module="Dataset",
        description=f"Uploaded '{filename}' by {current_user.name} ({current_user.role}): {valid_rows}/{total_rows} rows imported successfully ({invalid_rows} rejected).",
        user=current_user,
        record_id=str(log.id),
        request=request
    )

    create_notification(
        db=db,
        type="UPLOAD",
        title="Dataset Ingested",
        message=f"Dataset '{filename}' successfully imported {valid_rows} valid records into database by {current_user.name}.",
        severity="Low" if invalid_rows == 0 else "Medium"
    )

    return {
        "message": f"Successfully imported {valid_rows} rows into database.",
        "filename": filename,
        "total_rows": total_rows,
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "duplicate_rows": duplicate_rows,
        "successfully_imported_rows": valid_rows,
        "has_error_report": invalid_rows > 0,
        "validation_warnings": [f"Row {e['row_index']}: {', '.join(e['error_reasons'])}" for e in _latest_validation_errors[:10]]
    }

@router.get("/error-report")
def download_error_report(
    current_user: User = Depends(get_current_user)
):
    """
    Download error report for rejected rows from the most recent upload (Admin & Staff)
    """
    global _latest_validation_errors
    if not _latest_validation_errors:
        raise HTTPException(status_code=404, detail="No recent validation error report found.")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Row Number", "Error Reasons", "Raw Data"])

    for err in _latest_validation_errors:
        writer.writerow([
            err.get('row_index', 'N/A'),
            "; ".join(err.get('error_reasons', [])),
            str(err.get('raw_data', {}))
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="PredictIQ_Validation_Error_Report.csv"'}
    )

@router.get("/download/csv")
def download_dataset_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download the complete active historical food dataset as CSV (accessible by both Admin and Staff)
    """
    records = db.query(FoodRecord).order_by(FoodRecord.date.desc(), FoodRecord.id.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Date", "Food_Category", "Food_Prepared", "Food_Consumed",
        "Leftover", "Expected_Customers", "Holiday", "Special_Event", "Weather"
    ])

    for r in records:
        writer.writerow([
            r.id,
            r.date.strftime("%Y-%m-%d") if r.date else "",
            r.food_category,
            r.food_prepared,
            r.food_consumed,
            r.leftover,
            r.expected_customers,
            r.holiday,
            r.special_event,
            r.weather
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="PredictIQ_Food_Dataset.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/download/excel")
def download_dataset_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download the complete active historical food dataset as Excel spreadsheet (accessible by both Admin and Staff)
    """
    records = db.query(FoodRecord).order_by(FoodRecord.date.desc(), FoodRecord.id.desc()).all()
    data = [{
        "ID": r.id,
        "Date": r.date.strftime("%Y-%m-%d") if r.date else "",
        "Food Category": r.food_category,
        "Food Prepared": r.food_prepared,
        "Food Consumed": r.food_consumed,
        "Leftover": r.leftover,
        "Expected Customers": r.expected_customers,
        "Holiday": r.holiday,
        "Special Event": r.special_event,
        "Weather": r.weather
    } for r in records]

    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Food Dataset")

    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="PredictIQ_Food_Dataset.xlsx"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/download/template")
def download_sample_template(
    current_user: User = Depends(get_current_user)
):
    """
    Download standard sample CSV template for dataset ingestion (accessible by both Admin and Staff)
    """
    csv_content = (
        "Date,Food_Category,Food_Prepared,Food_Consumed,Leftover,Expected_Customers,Holiday,Special_Event,Weather\n"
        "2026-08-01,Meals,420,400,20,410,No,No,Sunny\n"
        "2026-08-02,Biryani,500,485,15,490,No,Yes,Cloudy\n"
        "2026-08-03,Breakfast,320,305,15,310,No,No,Sunny\n"
        "2026-08-04,Snacks,280,260,20,270,No,No,Rainy\n"
        "2026-08-05,Dinner,400,380,20,390,Yes,No,Cold\n"
        "2026-08-06,Desserts,180,170,10,185,No,No,Sunny\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="PredictIQ_Sample_Template.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/statistics")
def get_dataset_statistics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Feature 6: Summary statistics for the current historical database:
    - Total records
    - Total food prepared
    - Total food consumed
    - Total leftover
    - Average daily demand
    - Average customers
    - Number of food categories
    - Date range
    - Charts data
    """
    total_records = db.query(FoodRecord).count()
    if total_records == 0:
        return {
            "total_records": 0,
            "total_food_prepared": 0,
            "total_food_consumed": 0,
            "total_leftover": 0,
            "number_of_categories": 0,
            "date_range": {"min": None, "max": None},
            "category_distribution": [],
            "weather_distribution": [],
            "average_customers": 0,
            "average_daily_demand": 0,
            "average_prepared": 0,
            "average_consumed": 0,
            "average_wastage": 0
        }

    date_stats = db.query(func.min(FoodRecord.date), func.max(FoodRecord.date)).first()
    sum_stats = db.query(
        func.sum(FoodRecord.food_prepared),
        func.sum(FoodRecord.food_consumed),
        func.sum(FoodRecord.leftover)
    ).first()

    avg_stats = db.query(
        func.avg(FoodRecord.expected_customers),
        func.avg(FoodRecord.food_prepared),
        func.avg(FoodRecord.food_consumed),
        func.avg(FoodRecord.leftover)
    ).first()

    # Category counts
    cat_counts = db.query(FoodRecord.food_category, func.count(FoodRecord.id)).group_by(FoodRecord.food_category).all()
    cat_dist = [{"category": c, "count": count, "percentage": round((count/total_records)*100, 1)} for c, count in cat_counts]

    # Weather counts
    weather_counts = db.query(FoodRecord.weather, func.count(FoodRecord.id)).group_by(FoodRecord.weather).all()
    weather_dist = [{"weather": w, "count": count} for w, count in weather_counts]

    return {
        "total_records": total_records,
        "total_food_prepared": int(sum_stats[0] or 0),
        "total_food_consumed": int(sum_stats[1] or 0),
        "total_leftover": int(sum_stats[2] or 0),
        "number_of_categories": len(cat_counts),
        "date_range": {
            "min": date_stats[0].strftime("%Y-%m-%d") if date_stats[0] else None,
            "max": date_stats[1].strftime("%Y-%m-%d") if date_stats[1] else None
        },
        "category_distribution": cat_dist,
        "weather_distribution": weather_dist,
        "average_customers": round(float(avg_stats[0] or 0), 1),
        "average_daily_demand": round(float(avg_stats[2] or 0), 1),
        "average_prepared": round(float(avg_stats[1] or 0), 1),
        "average_consumed": round(float(avg_stats[2] or 0), 1),
        "average_wastage": round(float(avg_stats[3] or 0), 1)
    }

@router.get("/logs")
def get_dataset_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(DatasetLog).order_by(DatasetLog.id.desc()).limit(20).all()

@router.delete("/logs/clear-all")
def clear_all_dataset_logs(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin-only: Clear all dataset upload history records
    """
    deleted_count = db.query(DatasetLog).delete(synchronize_session=False)
    db.commit()

    log_audit_event(
        db=db,
        action="DATASET_LOGS_CLEARED",
        module="Dataset",
        description=f"Cleared {deleted_count} dataset upload history records",
        user=current_user,
        request=request
    )

    return {
        "success": True,
        "message": f"Successfully cleared {deleted_count} dataset upload history record(s).",
        "deleted_count": deleted_count
    }

@router.delete("/logs/{log_id}")
def delete_dataset_log(
    log_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin-only: Delete a single dataset upload history record by ID
    """
    log_item = db.query(DatasetLog).filter(DatasetLog.id == log_id).first()
    if not log_item:
        raise HTTPException(status_code=404, detail=f"Dataset upload log #{log_id} not found")

    filename = log_item.filename
    db.delete(log_item)
    db.commit()

    log_audit_event(
        db=db,
        action="DATASET_LOG_DELETED",
        module="Dataset",
        description=f"Deleted dataset upload log #{log_id} ({filename})",
        user=current_user,
        record_id=str(log_id),
        request=request
    )

    return {
        "success": True,
        "message": f"Dataset upload log #{log_id} deleted successfully."
    }

