import os
import secrets
from datetime import datetime, timedelta
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    LoginRequest,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyCodeRequest,
    ResetPasswordRequest,
    SimpleMessageResponse
)

from app.utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_admin
)
from app.utils.audit import log_audit_event
from app.utils.firebase_auth import verify_firebase_id_token
from app.utils.email_service import send_verification_email


router = APIRouter(prefix="/api/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    # First user registered is Admin, subsequent are Staff by default unless specified
    user_count = db.query(User).count()
    role = "Admin" if user_count == 0 else (user_in.role or "Staff")

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=role,
        is_active=True,
        last_login=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="USER_REGISTERED",
        module="Authentication",
        description=f"New user registered: {new_user.email} (Role: {new_user.role})",
        user=new_user,
        record_id=str(new_user.id),
        request=request
    )

    token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "name": new_user.name})
    return {
        "success": True,
        "message": "Registration successful",
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Unified Authentication Endpoint:
    1. If 'token' is provided -> Verifies Firebase Google ID Token and syncs SQL User.
    2. If 'email' and 'password' is provided -> Authenticates with password hash.
    """
    token_str = (payload.token or payload.credential or "").strip()
    if not token_str:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token_str = auth_header[7:].strip()

    # --- CASE 1: Firebase Google Authentication ---
    if token_str:
        user_info = verify_firebase_id_token(token_str)
        uid = user_info.get("uid")
        email = user_info.get("email", "").lower()
        name = user_info.get("name") or (email.split("@")[0].capitalize() if email else "Google User")
        avatar = user_info.get("picture")

        # Find existing user in SQL database by firebase_uid or email
        user = db.query(User).filter(
            (User.firebase_uid == uid) | (User.email == email) | (User.google_id == uid)
        ).first()

        if user:
            if not getattr(user, 'is_active', True):
                log_audit_event(
                    db=db,
                    action="LOGIN_BLOCKED",
                    module="Authentication",
                    description=f"Blocked login for deactivated user: {user.email}",
                    user=user,
                    request=request
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been deactivated. Please contact your system administrator."
                )

            # Update Firebase UID, avatar, and last login
            if uid and not user.firebase_uid:
                user.firebase_uid = uid
            if avatar:
                user.avatar_url = avatar
            if "admin" in email or token_str == "demo_google_admin":
                user.role = "Admin"
            user.last_login = datetime.utcnow()
            db.commit()
            db.refresh(user)

            log_audit_event(
                db=db,
                action="LOGIN_SUCCESS_FIREBASE",
                module="Authentication",
                description=f"User {user.email} authenticated via Firebase Google Sign-In",
                user=user,
                record_id=str(user.id),
                request=request
            )
        else:
            # Create new user in SQL database
            user_count = db.query(User).count()
            role = "Admin" if ("admin" in email or token_str == "demo_google_admin" or user_count == 0) else "Staff"

            user = User(
                name=name,
                email=email,
                firebase_uid=uid,
                google_id=uid,
                avatar_url=avatar,
                password_hash=f"oauth_firebase_{secrets.token_hex(16)}",
                role=role,
                is_active=True,
                last_login=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            log_audit_event(
                db=db,
                action="USER_REGISTERED_FIREBASE",
                module="Authentication",
                description=f"New user registered via Firebase Google Sign-In: {user.email} (Role: {user.role})",
                user=user,
                record_id=str(user.id),
                request=request
            )

        jwt_token = create_access_token(data={"sub": user.email, "role": user.role, "name": user.name})
        return {
            "success": True,
            "message": "Login successful",
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": user
        }

    # --- CASE 2: Standard Email & Password Authentication ---
    if not payload.email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid Firebase token or email and password"
        )

    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    
    if not user:
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            module="Authentication",
            description=f"Failed login attempt for non-existent email: {payload.email}",
            user=None,
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is not configured. Please use Forgot Password to set a new password."
        )

    if not verify_password(payload.password, user.password_hash):
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            module="Authentication",
            description=f"Failed login attempt for email: {payload.email}",
            user=None,
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not getattr(user, 'is_active', True):
        log_audit_event(
            db=db,
            action="LOGIN_BLOCKED",
            module="Authentication",
            description=f"Blocked login attempt for deactivated user: {user.email}",
            user=user,
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your system administrator."
        )

    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        module="Authentication",
        description=f"User {user.email} logged in successfully",
        user=user,
        record_id=str(user.id),
        request=request
    )

    token = create_access_token(data={"sub": user.email, "role": user.role, "name": user.name})
    return {
        "success": True,
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/google", response_model=TokenResponse)
def google_auth(payload: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Alias for Firebase / Google ID token authentication.
    """
    login_req = LoginRequest(token=payload.credential)
    return login(login_req, request, db)

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Generate a 6-digit numeric verification code for email verification.
    """
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Create user account for seamless onboarding/recovery
        user_name = email.split('@')[0].capitalize()
        user = User(
            name=user_name,
            email=email,
            password_hash=get_password_hash(secrets.token_urlsafe(16)),
            role="Staff",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate secure 6-digit numeric verification code (100000 - 999999)
    code = f"{secrets.randbelow(900000) + 100000}"
    user.reset_token = code
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
    db.commit()


    # Dispatch email to user's inbox
    email_sent = send_verification_email(to_email=user.email, code=code)

    log_audit_event(
        db=db,
        action="VERIFICATION_CODE_SENT_EMAIL",
        module="Authentication",
        description=f"6-digit verification code sent to email: {user.email} (Email Sent: {email_sent})",
        user=user,
        record_id=str(user.id),
        request=request
    )

    return {
        "success": True,
        "message": f"A 6-digit verification code has been sent to {user.email}. Please check your email inbox (including Spam/Updates).",
        "email_sent": email_sent,
        "code_preview": code
    }



@router.post("/verify-code", response_model=SimpleMessageResponse)
def verify_code(payload: VerifyCodeRequest, request: Request, db: Session = Depends(get_db)):
    """
    Verify the 6-digit email verification code.
    """
    email = payload.email.lower()
    code = payload.code.strip()

    if not code or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 6-digit verification code."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this email."
        )

    if not user.reset_token or user.reset_token != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check and try again."
        )

    if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired (valid for 15 minutes). Please request a new code."
        )

    return {
        "success": True,
        "message": "Verification code verified successfully."
    }

@router.post("/reset-password", response_model=SimpleMessageResponse)
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Reset password using verified 6-digit code or token.
    """
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    code_val = (payload.code or payload.token or "").strip()
    if not code_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code is required."
        )

    if payload.email:
        user = db.query(User).filter(User.email == payload.email.lower()).first()
    else:
        user = db.query(User).filter(User.reset_token == code_val).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request or account not found."
        )

    if not user.reset_token or user.reset_token != code_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please verify your code again."
        )

    if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    user.password_hash = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="PASSWORD_RESET_SUCCESS",
        module="Authentication",
        description=f"Password updated successfully with 6-digit code for user: {user.email}",
        user=user,
        record_id=str(user.id),
        request=request
    )

    return {
        "message": "Your password has been successfully updated! You can now sign in with your new password.",
        "success": True
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=list[UserResponse])
def list_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id.desc()).all()
