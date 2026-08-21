from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
import io
from app.database.database import get_db
from app.models.user import User
from app.services.report_service import generate_report_data, export_report_csv, export_report_excel, export_report_pdf_html
from app.utils.auth import get_current_user, require_admin, security, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

router = APIRouter(prefix="/api/reports", tags=["Reports"])

def get_user_from_header_or_query(
    token_query: Optional[str] = Query(None, alias="token"),
    auth_header = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Authorize user via standard Bearer header or fallback query param"""
    token = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    elif token_query:
        token = token_query

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required for report download",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.get("")
def get_reports(
    report_type: str = Query("food_demand"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    food_category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_from_header_or_query)
):
    return generate_report_data(
        db=db,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        food_category=food_category
    )

@router.get("/export/csv")
def download_csv_report(
    report_type: str = Query("food_demand"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    food_category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_from_header_or_query)
):
    data = generate_report_data(
        db=db,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        food_category=food_category
    )
    csv_content = export_report_csv(data)
    
    filename = f"PredictIQ_{report_type}_Report_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/export/excel")
def download_excel_report(
    report_type: str = Query("food_demand"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    food_category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_from_header_or_query)
):
    data = generate_report_data(
        db=db,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        food_category=food_category
    )
    excel_bytes = export_report_excel(data)
    
    filename = f"PredictIQ_{report_type}_Report_{date.today().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.get("/export/pdf")
def download_pdf_report(
    report_type: str = Query("food_demand"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    food_category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user_from_header_or_query)
):
    """
    Feature 15: PDF Printable Report Export
    """
    data = generate_report_data(
        db=db,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        food_category=food_category
    )
    html_content = export_report_pdf_html(data)
    
    filename = f"PredictIQ_{report_type}_Report_{date.today().strftime('%Y%m%d')}.html"
    return Response(
        content=html_content,
        media_type="text/html",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

from pydantic import BaseModel
from typing import List

class ReportBulkDeleteRequest(BaseModel):
    report_type: str
    ids: List[int]

@router.post("/bulk-delete")
def bulk_delete_reports(
    req: ReportBulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.services.report_service import bulk_delete_report_records
    if not req.ids:
        raise HTTPException(status_code=400, detail="No record IDs provided for deletion")

    deleted_count = bulk_delete_report_records(
        db=db,
        report_type=req.report_type,
        ids=req.ids,
        user_email=current_user.email
    )

    return {
        "message": f"Successfully deleted {deleted_count} records from {req.report_type} report view",
        "deleted_count": deleted_count
    }

@router.delete("/{report_type}/{id}")
def delete_single_report_item(
    report_type: str,
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.services.report_service import bulk_delete_report_records
    deleted_count = bulk_delete_report_records(
        db=db,
        report_type=report_type,
        ids=[id],
        user_email=current_user.email
    )
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"message": f"Successfully deleted record #{id}"}

