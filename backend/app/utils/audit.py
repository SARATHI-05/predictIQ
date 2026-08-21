from fastapi import Request
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User
from typing import Optional

def log_audit_event(
    db: Session,
    action: str,
    module: str,
    description: str,
    user: Optional[User] = None,
    record_id: Optional[str] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Helper to record audit events across all system modules"""
    client_ip = "127.0.0.1"
    if request:
        client_ip = request.client.host if request.client else "127.0.0.1"
        # Check forward headers if reverse proxied
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
    elif ip_address:
        client_ip = ip_address

    user_id = user.id if user else None
    user_email = user.email if user else "System/Anonymous"

    audit_entry = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action,
        module=module,
        record_id=str(record_id) if record_id else None,
        description=description,
        ip_address=str(client_ip) if client_ip else "127.0.0.1"
    )

    db.add(audit_entry)
    try:
        db.commit()
        db.refresh(audit_entry)
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to save audit log: {e}")
    return audit_entry
