from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import Optional
from datetime import date
from app.database.database import get_db
from app.models.food_record import FoodRecord
from app.models.user import User
from app.models.alert import Alert
from app.models.notification import Notification
from app.models.prediction_accuracy import PredictionAccuracy
from app.schemas.food_record import FoodRecordCreate, FoodRecordUpdate, FoodRecordResponse, BulkDeleteRequest
from app.schemas.common import PaginatedResponse
from app.utils.auth import get_current_user, require_admin
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/api/food-records", tags=["Food Records"])

@router.get("", response_model=PaginatedResponse)
def get_food_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    min_prepared: Optional[int] = None,
    max_prepared: Optional[int] = None,
    min_consumed: Optional[int] = None,
    max_consumed: Optional[int] = None,
    min_leftover: Optional[int] = None,
    max_leftover: Optional[int] = None,
    min_customers: Optional[int] = None,
    max_customers: Optional[int] = None,
    sort_by: Optional[str] = "date",
    sort_order: Optional[str] = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Feature 1: Advanced Search & Filtering on food records:
    - Search text
    - Date range (start_date, end_date)
    - Food category
    - Min/max prepared quantity
    - Min/max consumed quantity
    - Leftover quantity range
    - Expected customers range
    - Sorting & pagination
    """
    query = db.query(FoodRecord)

    if category and category != "All":
        query = query.filter(FoodRecord.food_category == category)

    if start_date:
        query = query.filter(FoodRecord.date >= start_date)

    if end_date:
        query = query.filter(FoodRecord.date <= end_date)

    if min_prepared is not None:
        query = query.filter(FoodRecord.food_prepared >= min_prepared)

    if max_prepared is not None:
        query = query.filter(FoodRecord.food_prepared <= max_prepared)

    if min_consumed is not None:
        query = query.filter(FoodRecord.food_consumed >= min_consumed)

    if max_consumed is not None:
        query = query.filter(FoodRecord.food_consumed <= max_consumed)

    if min_leftover is not None:
        query = query.filter(FoodRecord.leftover >= min_leftover)

    if max_leftover is not None:
        query = query.filter(FoodRecord.leftover <= max_leftover)

    if min_customers is not None:
        query = query.filter(FoodRecord.expected_customers >= min_customers)

    if max_customers is not None:
        query = query.filter(FoodRecord.expected_customers <= max_customers)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                FoodRecord.food_category.ilike(search_term),
                FoodRecord.weather.ilike(search_term),
                FoodRecord.holiday.ilike(search_term),
                FoodRecord.special_event.ilike(search_term)
            )
        )

    total = query.count()

    # Sorting
    sort_col = getattr(FoodRecord, sort_by, FoodRecord.date)
    if sort_order == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    records = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    data = [FoodRecordResponse.from_orm(r) for r in records]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "data": data
    }

@router.post("", response_model=FoodRecordResponse, status_code=status.HTTP_201_CREATED)
def create_food_record(
    record_in: FoodRecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    leftover = record_in.leftover
    if leftover is None or leftover == 0:
        leftover = max(0, record_in.food_prepared - record_in.food_consumed)

    new_record = FoodRecord(
        date=record_in.date,
        food_category=record_in.food_category,
        food_prepared=record_in.food_prepared,
        food_consumed=record_in.food_consumed,
        leftover=leftover,
        expected_customers=record_in.expected_customers,
        holiday=record_in.holiday or "No",
        special_event=record_in.special_event or "No",
        weather=record_in.weather or "Sunny"
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    # Check for excess leftover to trigger Surplus Alert & Notification
    if new_record.leftover >= 20:
        severity = "High" if new_record.leftover >= 50 else ("Medium" if new_record.leftover >= 30 else "Low")
        alert_msg = (
            f"Surplus Food Alert: {new_record.leftover} meals leftover for {new_record.food_category} on {new_record.date}. "
            f"(Prepared: {new_record.food_prepared}, Consumed: {new_record.food_consumed}). "
            f"Recommended: Dispatch excess to verified food recovery partners."
        )
        alert = Alert(
            alert_type="Surplus",
            message=alert_msg,
            severity=severity,
            is_read=False
        )
        db.add(alert)
        notif = Notification(
            type="SURPLUS",
            title=f"Food Surplus Logged: {new_record.food_category}",
            message=alert_msg,
            severity=severity,
            is_read=False
        )
        db.add(notif)
        db.commit()

    log_audit_event(
        db=db,
        action="FOOD_RECORD_CREATED",
        module="FoodRecords",
        description=f"Created food record: {new_record.food_category} on {new_record.date} (Prepared: {new_record.food_prepared}, Consumed: {new_record.food_consumed})",
        user=current_user,
        record_id=str(new_record.id),
        request=request
    )

    return new_record

@router.get("/{record_id}", response_model=FoodRecordResponse)
def get_food_record_by_id(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(FoodRecord).filter(FoodRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Food record not found")
    return record

@router.put("/{record_id}", response_model=FoodRecordResponse)
def update_food_record(
    record_id: int,
    record_in: FoodRecordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(FoodRecord).filter(FoodRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Food record not found")

    update_data = record_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    # Recalculate leftover if prepared or consumed changed
    if 'food_prepared' in update_data or 'food_consumed' in update_data:
        record.leftover = max(0, record.food_prepared - record.food_consumed)

    # Sync any PredictionAccuracy linked to this food_record
    linked_accs = db.query(PredictionAccuracy).filter(PredictionAccuracy.food_record_id == record.id).all()
    for acc in linked_accs:
        acc.actual_consumed = record.food_consumed
        acc.error = acc.predicted_demand - record.food_consumed
        acc.abs_error = abs(acc.error)
        acc.percentage_error = round((acc.abs_error / max(1, record.food_consumed)) * 100, 2)
        acc.accuracy_score = max(0.0, round(100.0 - acc.percentage_error, 2))

    # If leftover is high, trigger surplus notification
    if record.leftover >= 20:
        severity = "High" if record.leftover >= 50 else ("Medium" if record.leftover >= 30 else "Low")
        alert_msg = (
            f"Surplus Alert Updated: {record.leftover} meals leftover for {record.food_category} on {record.date}. "
            f"Consider dispatching excess food to donation partners."
        )
        alert = Alert(
            alert_type="Surplus",
            message=alert_msg,
            severity=severity,
            is_read=False
        )
        db.add(alert)

    db.commit()
    db.refresh(record)

    log_audit_event(
        db=db,
        action="FOOD_RECORD_UPDATED",
        module="FoodRecords",
        description=f"Updated food record #{record.id} ({record.food_category} on {record.date})",
        user=current_user,
        record_id=str(record.id),
        request=request
    )

    return record

@router.delete("/{record_id}", status_code=status.HTTP_200_OK)
def delete_food_record(
    record_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    record = db.query(FoodRecord).filter(FoodRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Food record not found")

    rec_info = f"{record.food_category} on {record.date}"
    db.delete(record)
    db.commit()

    log_audit_event(
        db=db,
        action="FOOD_RECORD_DELETED",
        module="FoodRecords",
        description=f"Deleted food record #{record_id} ({rec_info})",
        user=current_user,
        record_id=str(record_id),
        request=request
    )

    return {"message": f"Food record #{record_id} deleted successfully"}

@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_food_records(
    bulk_in: BulkDeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if not bulk_in.ids:
        raise HTTPException(status_code=400, detail="No record IDs provided")

    deleted_count = db.query(FoodRecord).filter(FoodRecord.id.in_(bulk_in.ids)).delete(synchronize_session=False)
    db.commit()

    log_audit_event(
        db=db,
        action="FOOD_RECORDS_BULK_DELETED",
        module="FoodRecords",
        description=f"Bulk deleted {deleted_count} food records",
        user=current_user,
        record_id="bulk",
        request=request
    )

    return {"message": f"Successfully deleted {deleted_count} food records", "deleted_count": deleted_count}
