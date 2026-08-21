from sqlalchemy.orm import Session
from app.models.notification import Notification
from typing import Optional

def create_notification(
    db: Session,
    type: str,
    title: str,
    message: str,
    severity: str = "Medium",
    user_id: Optional[int] = None
) -> Notification:
    """Helper to dispatch real persistent notifications into notification center"""
    notif = Notification(
        user_id=user_id,
        type=type.upper(),
        title=title,
        message=message,
        severity=severity,
        is_read=False
    )
    db.add(notif)
    try:
        db.commit()
        db.refresh(notif)
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to save notification: {e}")
    return notif
