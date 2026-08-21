from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import UserResponse
from app.utils.auth import require_admin, get_current_user
from app.utils.audit import log_audit_event
from pydantic import BaseModel
from datetime import datetime

from app.models.notification import Notification

router = APIRouter(prefix="/api/users", tags=["User Management"])

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role: str # 'Admin' or 'Staff'

class UserDetailResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    activity_count: int = 0

    class Config:
        from_attributes = True

@router.get("", response_model=List[UserDetailResponse])
def list_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: Retrieve user list with activity metrics, search, and status filtering"""
    query = db.query(User)
    if search:
        term = f"%{search}%"
        query = query.filter((User.name.ilike(term)) | (User.email.ilike(term)))
    if role and role != "All":
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.order_by(User.id.asc()).all()
    user_details = []

    for u in users:
        activity_cnt = db.query(AuditLog).filter(AuditLog.user_id == u.id).count()
        user_details.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "is_active": getattr(u, 'is_active', True),
            "last_login": getattr(u, 'last_login', None),
            "created_at": u.created_at,
            "activity_count": activity_cnt
        })

    return user_details

@router.put("/{user_id}/status")
def toggle_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: Activate or deactivate user access"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and not status_in.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own active admin account")

    user.is_active = status_in.is_active
    db.commit()
    db.refresh(user)

    action = "USER_ACTIVATED" if user.is_active else "USER_DEACTIVATED"
    log_audit_event(
        db=db,
        action=action,
        module="UserManagement",
        description=f"User {user.email} status changed to {'Active' if user.is_active else 'Inactive'} by {current_user.email}",
        user=current_user,
        record_id=str(user.id),
        request=request
    )

    return {"message": f"User status updated to {'Active' if user.is_active else 'Inactive'}", "is_active": user.is_active}

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,
    role_in: UserRoleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: Update user role (Admin / Staff)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if role_in.role not in ["Admin", "Staff"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'Admin' or 'Staff'")

    old_role = user.role
    user.role = role_in.role
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="USER_ROLE_CHANGED",
        module="UserManagement",
        description=f"User {user.email} role changed from {old_role} to {user.role} by {current_user.email}",
        user=current_user,
        record_id=str(user.id),
        request=request
    )

    return {"message": f"User role updated to {user.role}", "role": user.role}

@router.get("/{user_id}/activity")
def get_user_activity(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: View user's recent audit activity trail"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    activities = db.query(AuditLog).filter(AuditLog.user_id == user.id).order_by(AuditLog.id.desc()).limit(20).all()
    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": getattr(user, 'is_active', True),
        "activities": activities
    }

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin-only: Permanently delete a user account"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active admin account")

    if user.role == "Admin":
        admin_count = db.query(User).filter(User.role == "Admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the only remaining Admin account in the system")

    # Clean up associated notifications
    db.query(Notification).filter(Notification.user_id == user.id).delete()

    deleted_email = user.email
    deleted_name = user.name
    deleted_role = user.role

    db.delete(user)
    db.commit()

    log_audit_event(
        db=db,
        action="USER_DELETED",
        module="UserManagement",
        description=f"User {deleted_email} (Name: {deleted_name}, Role: {deleted_role}) was permanently deleted by {current_user.email}",
        user=current_user,
        record_id=str(user_id),
        request=request
    )

    return {
        "message": f"User {deleted_email} has been permanently deleted",
        "deleted_user_id": user_id
    }

