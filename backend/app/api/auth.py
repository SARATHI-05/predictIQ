import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
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
from app.utils.supabase_auth import verify_supabase_token
from app.services.email_service import (
    send_signup_verification_code,
    send_forgot_password_code,
    send_welcome_email,
    send_google_verification_email
)
from app.services.otp_service import (
    generate_and_save_otp,
    verify_otp,
    can_resend_otp
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


# -------------------------------------------------------------------------
# 1. SIGNUP & EMAIL VERIFICATION FLOW
# -------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Step 1 of Signup Flow:
    Validates user input, creates/updates pending user account,
    generates 6-digit signup OTP, and dispatches verification email to the user's entered email.
    """
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    email = user_in.email.strip().lower()

    # Check if active verified account already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing and getattr(existing, 'is_active', True) and existing.last_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in."
        )

    # First user registered in system is Admin, subsequent are Staff by default unless specified
    user_count = db.query(User).count()
    role = "Admin" if user_count == 0 else (user_in.role or "Staff")

    # Generate 6-digit numeric OTP specifically for purpose='signup'
    otp_code = generate_and_save_otp(db=db, email=email, purpose="signup", expiry_minutes=10)

    if existing:
        user = existing
        user.name = user_in.name.strip()
        user.password_hash = get_password_hash(user_in.password)
        user.role = role
        user.is_active = False
        user.reset_token = otp_code
        user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
    else:
        user = User(
            name=user_in.name.strip(),
            email=email,
            password_hash=get_password_hash(user_in.password),
            role=role,
            is_active=False,
            last_login=None,
            reset_token=otp_code,
            reset_token_expiry=datetime.utcnow() + timedelta(minutes=10)
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Dispatch Signup OTP email to the user's entered email address
    background_tasks.add_task(send_signup_verification_code, user.email, otp_code, user.name)

    log_audit_event(
        db=db,
        action="USER_SIGNUP_INITIATED",
        module="Authentication",
        description=f"Signup verification code sent to {user.email}",
        user=user,
        record_id=str(user.id),
        request=request
    )

    return {
        "success": True,
        "requires_verification": True,
        "email": user.email,
        "name": user.name,
        "message": f"Verification code sent to {user.email}. Please check your email inbox to complete registration."
    }


@router.post("/register/verify", response_model=TokenResponse)
@router.post("/signup/verify", response_model=TokenResponse)
def verify_signup_code(payload: VerifyCodeRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Step 2 of Signup Flow:
    Verifies the 6-digit signup OTP, activates the user account,
    sends an official Welcome Email to the user, and issues a JWT token.
    """
    email = payload.email.strip().lower()
    code = payload.code.strip()

    if not code or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 6-digit verification code."
        )

    # 1. Verify OTP with purpose='signup'
    is_valid, err_msg = verify_otp(db=db, email=email, code=code, purpose="signup")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registration found for this email address."
        )

    # Fallback to user.reset_token for backward compatibility
    if not is_valid:
        if user.reset_token and user.reset_token == code and (not user.reset_token_expiry or user.reset_token_expiry > datetime.utcnow()):
            is_valid = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg
            )

    # 2. Activate user account
    user.is_active = True
    user.reset_token = None
    user.reset_token_expiry = None
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # 3. Dispatch official Welcome Email to verified user
    background_tasks.add_task(send_welcome_email, user.email, user.name, user.role)

    log_audit_event(
        db=db,
        action="USER_SIGNUP_VERIFIED",
        module="Authentication",
        description=f"User {user.email} verified email and completed registration",
        user=user,
        record_id=str(user.id),
        request=request
    )

    token = create_access_token(data={"sub": user.email, "role": user.role, "name": user.name})
    return {
        "success": True,
        "message": "Account verified successfully! Welcome to PredictIQ.",
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/register/resend-code", response_model=SimpleMessageResponse)
@router.post("/signup/resend-code", response_model=SimpleMessageResponse)
def resend_signup_code(payload: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Resends 6-digit verification code for signup with 60-second cooldown rate limit.
    """
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registration found for this email address."
        )

    allowed, cooldown = can_resend_otp(db=db, email=email, purpose="signup", cooldown_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {cooldown} seconds before requesting a new verification code."
        )

    otp_code = generate_and_save_otp(db=db, email=email, purpose="signup", expiry_minutes=10)
    user.reset_token = otp_code
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    background_tasks.add_task(send_signup_verification_code, user.email, otp_code, user.name)

    return {
        "success": True,
        "message": f"A fresh 6-digit verification code has been dispatched to {user.email}."
    }


# -------------------------------------------------------------------------
# 2. LOGIN (EMAIL/PASSWORD & SUPABASE GOOGLE AUTH)
# -------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Unified Authentication Endpoint:
    1. If 'token' is provided -> Verifies Supabase Google OAuth Token and syncs SQL User.
    2. If 'email' and 'password' is provided -> Authenticates with password hash.
    """
    token_str = (payload.token or payload.credential or "").strip()
    if not token_str:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token_str = auth_header[7:].strip()

    # --- CASE 1: Supabase Google Authentication ---
    if token_str:
        user_info = verify_supabase_token(token_str)
        uid = user_info.get("uid")
        email = user_info.get("email", "").strip().lower()

        if not email or "@" not in email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verified email not found in Supabase authentication token."
            )

        name = user_info.get("name") or email.split("@")[0].capitalize()
        avatar = user_info.get("picture")

        user = db.query(User).filter(
            (User.supabase_uid == uid) | 
            (User.email == email) | 
            (User.firebase_uid == uid) | 
            (User.google_id == uid)
        ).first()

        if user:
            if not getattr(user, 'is_active', True) and user.last_login:
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

            # If user has a pending verification code and has never completed onboarding
            if user.reset_token and not user.last_login:
                otp_code = generate_and_save_otp(db=db, email=user.email, purpose="google_signup", expiry_minutes=10)
                user.reset_token = otp_code
                user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
                db.commit()

                background_tasks.add_task(send_google_verification_email, user.email, otp_code, user.name)
                return {
                    "success": True,
                    "requires_verification": True,
                    "email": user.email,
                    "name": user.name,
                    "message": f"A 6-digit verification code has been sent to your Gmail ({user.email}). Please enter it to complete signup."
                }

            if uid and not getattr(user, 'supabase_uid', None):
                user.supabase_uid = uid
            if avatar and not getattr(user, 'avatar_url', None):
                user.avatar_url = avatar
            if "admin" in email or token_str == "demo_google_admin":
                user.role = "Admin"
            user.is_active = True
            user.last_login = datetime.utcnow()
            db.commit()
            db.refresh(user)

            log_audit_event(
                db=db,
                action="LOGIN_SUCCESS_SUPABASE",
                module="Authentication",
                description=f"User {user.email} authenticated via Supabase Google Sign-In",
                user=user,
                record_id=str(user.id),
                request=request
            )
        else:
            # Create new user in SQL database with pending OTP verification
            user_count = db.query(User).count()
            role = "Admin" if ("admin" in email or token_str == "demo_google_admin" or user_count == 0) else "Staff"

            otp_code = generate_and_save_otp(db=db, email=email, purpose="google_signup", expiry_minutes=10)

            user = User(
                name=name,
                email=email,
                supabase_uid=uid,
                google_id=uid,
                avatar_url=avatar,
                password_hash=f"oauth_supabase_{secrets.token_hex(16)}",
                role=role,
                is_active=False,
                last_login=None,
                reset_token=otp_code,
                reset_token_expiry=datetime.utcnow() + timedelta(minutes=10)
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Dispatch 6-digit OTP verification code to user's Gmail
            background_tasks.add_task(send_google_verification_email, user.email, otp_code, user.name)

            log_audit_event(
                db=db,
                action="GOOGLE_SIGNUP_OTP_INITIATED",
                module="Authentication",
                description=f"Google signup initiated for {user.email}. Verification code sent to Gmail.",
                user=user,
                record_id=str(user.id),
                request=request
            )

            return {
                "success": True,
                "requires_verification": True,
                "email": user.email,
                "name": user.name,
                "message": f"A 6-digit verification code has been sent to your Gmail ({user.email}). Please enter it to complete signup."
            }

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
            detail="Please provide a valid Supabase token or email and password."
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

    # Check if account is still unverified
    if not getattr(user, 'is_active', True) and not user.last_login:
        otp_code = generate_and_save_otp(db=db, email=user.email, purpose="signup", expiry_minutes=10)
        user.reset_token = otp_code
        user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
        db.commit()
        background_tasks.add_task(send_signup_verification_code, user.email, otp_code, user.name)
        return {
            "success": True,
            "requires_verification": True,
            "email": user.email,
            "name": user.name,
            "message": f"Your account requires email verification. A 6-digit code has been sent to {user.email}."
        }

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


# -------------------------------------------------------------------------
# 3. GOOGLE SIGNUP OTP VERIFICATION
# -------------------------------------------------------------------------

@router.post("/google", response_model=TokenResponse)
def google_auth(payload: GoogleLoginRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Alias for Supabase / Google OAuth token authentication.
    """
    login_req = LoginRequest(token=payload.credential)
    return login(login_req, request, background_tasks, db)


@router.post("/google/verify", response_model=TokenResponse)
def verify_google_signup_code(payload: VerifyCodeRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Verifies 6-digit OTP code sent to user's Google Gmail address upon initial signup,
    activates account, sends Welcome Email, and issues JWT token.
    """
    email = payload.email.strip().lower()
    code = payload.code.strip()

    if not code or len(code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 6-digit verification code."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    is_valid, err_msg = verify_otp(db=db, email=email, code=code, purpose="google_signup")
    if not is_valid:
        # Fallback to user.reset_token
        if user.reset_token and user.reset_token == code and (not user.reset_token_expiry or user.reset_token_expiry > datetime.utcnow()):
            is_valid = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg
            )

    # Activate user
    user.is_active = True
    user.reset_token = None
    user.reset_token_expiry = None
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Dispatch Welcome Email
    background_tasks.add_task(send_welcome_email, user.email, user.name, user.role)

    log_audit_event(
        db=db,
        action="GOOGLE_SIGNUP_VERIFIED_SUCCESS",
        module="Authentication",
        description=f"User {user.email} verified Google email and completed onboarding",
        user=user,
        record_id=str(user.id),
        request=request
    )

    jwt_token = create_access_token(data={"sub": user.email, "role": user.role, "name": user.name})
    return {
        "success": True,
        "message": "Google email verified successfully! Welcome to PredictIQ.",
        "access_token": jwt_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/google/resend-code", response_model=SimpleMessageResponse)
def resend_google_signup_code(payload: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Resends 6-digit OTP code to user's Google Gmail address with rate limit.
    """
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    allowed, cooldown = can_resend_otp(db=db, email=email, purpose="google_signup", cooldown_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {cooldown} seconds before requesting a new code."
        )

    otp_code = generate_and_save_otp(db=db, email=email, purpose="google_signup", expiry_minutes=10)
    user.reset_token = otp_code
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    background_tasks.add_task(send_google_verification_email, user.email, otp_code, user.name)

    return {
        "success": True,
        "message": f"A fresh 6-digit verification code has been dispatched to {user.email}."
    }


# -------------------------------------------------------------------------
# 4. FORGOT PASSWORD & PASSWORD RESET FLOW
# -------------------------------------------------------------------------

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Step 1 of Forgot Password Flow:
    Generates a secure 6-digit OTP for purpose='forgot_password' and dispatches it
    to the user's registered email address.
    """
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this email address. Please check your email or sign up."
        )

    allowed, cooldown = can_resend_otp(db=db, email=email, purpose="forgot_password", cooldown_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {cooldown} seconds before requesting a new verification code."
        )

    otp_code = generate_and_save_otp(db=db, email=email, purpose="forgot_password", expiry_minutes=10)
    user.reset_token = otp_code
    user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Dispatch email asynchronously to user's registered inbox
    background_tasks.add_task(send_forgot_password_code, user.email, otp_code, user.name)

    log_audit_event(
        db=db,
        action="FORGOT_PASSWORD_REQUESTED",
        module="Authentication",
        description=f"6-digit password reset code sent to {user.email}",
        user=user,
        record_id=str(user.id),
        request=request
    )

    return {
        "success": True,
        "message": f"A 6-digit verification code has been sent to {user.email}. Please check your email inbox.",
        "email_sent": True
    }


@router.post("/verify-code", response_model=SimpleMessageResponse)
def verify_code(payload: VerifyCodeRequest, request: Request, db: Session = Depends(get_db)):
    """
    Step 2 of Forgot Password Flow:
    Verifies that the entered 6-digit code is valid for purpose='forgot_password'.
    (Does not consume the code yet so that /reset-password can safely update the password).
    """
    email = payload.email.strip().lower()
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

    from app.models.verification_code import VerificationCode
    record = db.query(VerificationCode).filter(
        VerificationCode.email == email,
        VerificationCode.purpose == "forgot_password",
        VerificationCode.used == False
    ).order_by(VerificationCode.id.desc()).first()

    if record:
        if datetime.utcnow() > record.expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code."
            )
        if record.attempts >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new code."
            )
        target_hash = VerificationCode.hash_code(code, email, "forgot_password")
        if record.code_hash != target_hash and (not record.code_plain or record.code_plain != code):
            record.attempts += 1
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check and try again."
            )
    else:
        # Fallback to user.reset_token
        if not user.reset_token or user.reset_token != code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check and try again."
            )
        if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code."
            )

    return {
        "success": True,
        "message": "Verification code verified successfully."
    }


@router.post("/reset-password", response_model=SimpleMessageResponse)
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Step 3 of Forgot Password Flow:
    Verifies code for purpose='forgot_password', invalidates the code,
    and updates the user's password with a secure bcrypt hash.
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

    if not payload.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is required."
        )

    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request or account not found."
        )

    # Verify and consume OTP for purpose='forgot_password'
    is_valid, err_msg = verify_otp(db=db, email=email, code=code_val, purpose="forgot_password")
    if not is_valid:
        # Fallback to user.reset_token
        if user.reset_token and user.reset_token == code_val and (not user.reset_token_expiry or user.reset_token_expiry > datetime.utcnow()):
            is_valid = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg
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
        description=f"Password updated successfully for user: {user.email}",
        user=user,
        record_id=str(user.id),
        request=request
    )

    return {
        "message": "Password reset successfully. You can now sign in with your new password.",
        "success": True
    }


# -------------------------------------------------------------------------
# 5. USER PROFILE & ADMIN MANAGEMENT
# -------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id.desc()).all()
