import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User

SECRET_KEY = os.getenv("SECRET_KEY", "predictiq-super-secret-production-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from app.utils.supabase_auth import verify_supabase_token

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise credentials_exception
        
    token = credentials.credentials

    # 1. First Attempt: PredictIQ HS256 JWT Token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email:
            user = db.query(User).filter(User.email == email.lower()).first()
            if user:
                return user
    except Exception:
        pass

    # 2. Second Attempt: Supabase Auth / Google OAuth Token
    try:
        supabase_info = verify_supabase_token(token)
        sb_email = (supabase_info.get("email") or "").lower()
        sb_uid = supabase_info.get("uid")
        raw_name = supabase_info.get("name")
        if raw_name and raw_name not in ["PredictIQ User", "Google User"]:
            sb_name = raw_name
        elif sb_email:
            sb_name = sb_email.split("@")[0].replace(".", " ").replace("_", " ").replace("-", " ").title()
        else:
            sb_name = "PredictIQ User"
        sb_avatar = supabase_info.get("picture")

        user = None
        if sb_uid:
            user = db.query(User).filter(
                (User.supabase_uid == sb_uid) | 
                (User.firebase_uid == sb_uid) | 
                (User.google_id == sb_uid)
            ).first()
        if not user and sb_email:
            user = db.query(User).filter(User.email == sb_email).first()

        if user:
            # Safely sync Supabase UID, Name, and Avatar
            updated = False
            if sb_uid and not getattr(user, 'supabase_uid', None):
                user.supabase_uid = sb_uid
                updated = True
            if (not user.name or user.name in ["PredictIQ User", "Google User"]) and sb_name != "PredictIQ User":
                user.name = sb_name
                updated = True
            if sb_avatar and not getattr(user, 'avatar_url', None):
                user.avatar_url = sb_avatar
                updated = True
            if updated:
                db.commit()
                db.refresh(user)
            return user

        # If user doesn't exist in DB yet, auto-provision account
        user_count = db.query(User).count()
        role = "Admin" if (user_count == 0 or "admin" in (sb_email or "").lower()) else "Staff"
        new_user = User(
            email=sb_email or f"{sb_uid}@auth.predictiq",
            name=sb_name,
            role=role,
            supabase_uid=sb_uid,
            avatar_url=sb_avatar,
            is_active=True,
            last_login=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Dispatch official Welcome Email to newly registered user
        if sb_email and "@" in sb_email:
            try:
                import threading
                from app.services.email_service import send_welcome_email
                threading.Thread(
                    target=send_welcome_email, 
                    args=(new_user.email, new_user.name, new_user.role), 
                    daemon=True
                ).start()
            except Exception as mail_err:
                print(f"[Auth] Notice: Could not send welcome email: {mail_err}")

        return new_user
    except HTTPException:
        raise
    except Exception:
        pass

    raise credentials_exception


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional user authentication for overview feeds and public dashboards.
    Returns User if valid token is provided, None otherwise without throwing 401.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials=credentials, db=db)
    except Exception:
        return None


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required for this operation"
        )
    return current_user

def require_staff_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["Admin", "Staff"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Valid role access required"
        )
    return current_user
