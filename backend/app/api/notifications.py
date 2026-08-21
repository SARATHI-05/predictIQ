from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.utils.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/notifications", tags=["Notification Center"])

class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    type: str
    title: str
    message: str
    severity: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    filter_type: Optional[str] = Query("unread"), # 'unread', 'all', 'read'/'archived', or specific type
    unread_only: Optional[bool] = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve persistent notifications with optional unread / category / archive filtering"""
    query = db.query(Notification)
    if filter_type == "unread":
        query = query.filter(Notification.is_read == False)
    elif filter_type in ("read", "archived", "resolved"):
        query = query.filter(Notification.is_read == True)
    elif filter_type and filter_type.lower() != "all":
        query = query.filter(Notification.type == filter_type.upper())
        if unread_only:
            query = query.filter(Notification.is_read == False)
    elif unread_only:
        query = query.filter(Notification.is_read == False)

    return query.order_by(Notification.is_read.asc(), Notification.created_at.desc()).limit(limit).all()

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of pending unread notifications for navbar indicator"""
    count = db.query(Notification).filter(Notification.is_read == False).count()
    return {"unread_count": count}

@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a single notification as read"""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification"""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": f"Notification #{notification_id} deleted"}
