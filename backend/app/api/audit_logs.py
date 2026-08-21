from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from typing import List, Optional
from datetime import date, datetime
import csv
import io
from app.database.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.auth import require_admin
from pydantic import BaseModel

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Trail"])

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    module: str
    record_id: Optional[str] = None
    description: str
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class BulkDeleteAuditRequest(BaseModel):
    ids: List[int]

@router.get("")
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    user_email: Optional[str] = None,
    action: Optional[str] = None,
    module: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: Query, filter, and search system audit log trail"""
    query = db.query(AuditLog)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.description.ilike(term),
                AuditLog.action.ilike(term),
                AuditLog.module.ilike(term),
                AuditLog.user_email.ilike(term)
            )
        )

    if user_email and user_email != "All":
        query = query.filter(AuditLog.user_email == user_email)

    if action and action != "All":
        query = query.filter(AuditLog.action == action)

    if module and module != "All":
        query = query.filter(AuditLog.module == module)

    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)

    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)

    total = query.count()
    logs = query.order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    data = [AuditLogResponse.from_orm(l) for l in logs]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "data": data
    }

@router.get("/export/csv")
def export_audit_logs_csv(
    search: Optional[str] = None,
    user_email: Optional[str] = None,
    action: Optional[str] = None,
    module: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Export filtered audit trail to CSV"""
    query = db.query(AuditLog)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.description.ilike(term),
                AuditLog.action.ilike(term),
                AuditLog.module.ilike(term),
                AuditLog.user_email.ilike(term)
            )
        )
    if user_email and user_email != "All":
        query = query.filter(AuditLog.user_email == user_email)
    if action and action != "All":
        query = query.filter(AuditLog.action == action)
    if module and module != "All":
        query = query.filter(AuditLog.module == module)
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)

    logs = query.order_by(AuditLog.id.desc()).limit(1000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "User Email", "Action", "Module", "Record ID", "Description", "IP Address"])
    for l in logs:
        writer.writerow([
            l.id,
            l.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            l.user_email,
            l.action,
            l.module,
            l.record_id or "N/A",
            l.description,
            l.ip_address
        ])

    filename = f"PredictIQ_Audit_Trail_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.delete("/bulk")
def bulk_delete_audit_logs(
    payload: BulkDeleteAuditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: Bulk delete selected audit trail records"""
    if not payload.ids:
        raise HTTPException(status_code=400, detail="No audit log IDs provided for deletion")

    deleted_count = db.query(AuditLog).filter(AuditLog.id.in_(payload.ids)).delete(synchronize_session=False)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully deleted {deleted_count} audit trail record(s)."
    }

@router.delete("/{log_id}")
def delete_single_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: Delete a single audit log record by ID"""
    log_item = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log_item:
        raise HTTPException(status_code=404, detail=f"Audit record #{log_id} not found")

    db.delete(log_item)
    db.commit()

    return {
        "success": True,
        "message": f"Audit record #{log_id} deleted successfully."
    }
