import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.verification_code import VerificationCode

def generate_and_save_otp(db: Session, email: str, purpose: str, expiry_minutes: int = 10) -> str:
    """
    Generates a cryptographically secure 6-digit OTP, invalidates prior active codes for this purpose,
    stores the hashed code in the database, and returns the plaintext OTP for email delivery.
    """
    clean_email = email.strip().lower()
    clean_purpose = purpose.strip().lower()

    # Invalidate all prior unused OTPs for this email & purpose
    db.query(VerificationCode).filter(
        VerificationCode.email == clean_email,
        VerificationCode.purpose == clean_purpose,
        VerificationCode.used == False
    ).update({"used": True})
    db.commit()

    # Generate 6-digit numeric OTP (100000 - 999999)
    code = f"{secrets.randbelow(900000) + 100000}"
    code_hash = VerificationCode.hash_code(code, clean_email, clean_purpose)

    otp_record = VerificationCode(
        email=clean_email,
        code_hash=code_hash,
        code_plain=code,
        purpose=clean_purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes),
        used=False,
        attempts=0,
        created_at=datetime.utcnow()
    )
    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)

    return code


def verify_otp(db: Session, email: str, code: str, purpose: str) -> tuple[bool, str]:
    """
    Verifies a 6-digit OTP for a specific purpose ('signup', 'forgot_password', 'google_signup').
    Enforces expiration (10 mins), single-use invalidation, attempt limits (max 5),
    and purpose isolation.
    """
    clean_email = email.strip().lower()
    clean_code = code.strip()
    clean_purpose = purpose.strip().lower()

    if not clean_code or len(clean_code) != 6 or not clean_code.isdigit():
        return False, "Please enter a valid 6-digit verification code."

    # Look for the latest unused OTP for this email and purpose
    record = db.query(VerificationCode).filter(
        VerificationCode.email == clean_email,
        VerificationCode.purpose == clean_purpose,
        VerificationCode.used == False
    ).order_by(VerificationCode.id.desc()).first()

    if not record:
        return False, "No active verification code found for this account. Please request a new code."

    # Check expiration
    if datetime.utcnow() > record.expires_at:
        record.used = True
        db.commit()
        return False, "Verification code has expired. Please request a new code."

    # Check attempt limit to prevent brute force
    if record.attempts >= 5:
        record.used = True
        db.commit()
        return False, "Too many failed attempts. This code has been invalidated. Please request a new code."

    # Verify code match
    target_hash = VerificationCode.hash_code(clean_code, clean_email, clean_purpose)
    if record.code_hash == target_hash or (record.code_plain and record.code_plain == clean_code):
        record.used = True
        db.commit()
        return True, "Verification successful"

    # Failed attempt
    record.attempts += 1
    remaining = 5 - record.attempts
    db.commit()
    return False, f"Invalid verification code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."


def can_resend_otp(db: Session, email: str, purpose: str, cooldown_seconds: int = 60) -> tuple[bool, int]:
    """
    Checks rate limiting on OTP resend requests (60 seconds cooldown).
    Returns (True, 0) if resend allowed, or (False, seconds_remaining).
    """
    clean_email = email.strip().lower()
    clean_purpose = purpose.strip().lower()

    latest_record = db.query(VerificationCode).filter(
        VerificationCode.email == clean_email,
        VerificationCode.purpose == clean_purpose
    ).order_by(VerificationCode.id.desc()).first()

    if not latest_record:
        return True, 0

    elapsed = (datetime.utcnow() - latest_record.created_at).total_seconds()
    if elapsed < cooldown_seconds:
        return False, int(cooldown_seconds - elapsed)

    return True, 0
