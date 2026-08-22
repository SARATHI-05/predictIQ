import os
import sys
import secrets
from datetime import datetime, timedelta

# Setup paths
backend_dir = r"c:\Users\Sarathi\predictIQ\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.verification_code import VerificationCode
from app.services.email_service import (
    get_smtp_config,
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
from app.utils.auth import get_password_hash, verify_password, create_access_token

def run_tests():
    print("=" * 60)
    print("RUNNING PREDICTIQ COMPLETE SMTP & OTP TEST SUITE")
    print("=" * 60)

    # 1. Ensure DB tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    test_user_email = f"test_smtp_user_{secrets.token_hex(4)}@predictiq-test.com"
    test_real_email = "sarath.m.ad.2024@snsce.ac.in"
    test_password = "SecurePassword123!"

    try:
        # TEST 1: SMTP Config validation
        print("\n[TEST 1] Verifying SMTP Configuration...")
        config = get_smtp_config()
        assert config["host"] == "smtp.gmail.com", f"Expected smtp.gmail.com, got {config['host']}"
        assert config["user"] == "predictiqfoodmanagement@gmail.com", f"Unexpected SMTP user: {config['user']}"
        assert config["from_email"] == "predictiqfoodmanagement@gmail.com", f"Unexpected from_email: {config['from_email']}"
        assert len(config["password"]) > 5, "Missing SMTP password"
        print("  [PASS] SMTP Configuration verified successfully.")

        # TEST 2: Live SMTP Dispatch for all 3 email types to real test address
        print(f"\n[TEST 2] Testing Live SMTP delivery to '{test_real_email}'...")
        
        signup_ok = send_signup_verification_code(email=test_real_email, otp="654321", name="Sarathi Test")
        assert signup_ok, "Signup verification email delivery failed!"
        print("  [PASS] 1. Signup verification email sent successfully.")

        forgot_ok = send_forgot_password_code(email=test_real_email, otp="123456", name="Sarathi Test")
        assert forgot_ok, "Forgot password verification email delivery failed!"
        print("  [PASS] 2. Forgot password verification email sent successfully.")

        welcome_ok = send_welcome_email(email=test_real_email, name="Sarathi Test", role="Admin")
        assert welcome_ok, "Welcome email delivery failed!"
        print("  [PASS] 3. Welcome email sent successfully.")

        google_ok = send_google_verification_email(email=test_real_email, otp="789012", name="Sarathi Test")
        assert google_ok, "Google verification email delivery failed!"
        print("  [PASS] 4. Google verification email sent successfully.")

        # TEST 3: Signup OTP Lifecycle
        print(f"\n[TEST 3] Testing Signup OTP Lifecycle for '{test_user_email}'...")
        # Create unverified user
        new_user = User(
            name="Test Candidate",
            email=test_user_email,
            password_hash=get_password_hash(test_password),
            role="Staff",
            is_active=False
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Generate signup OTP
        otp_1 = generate_and_save_otp(db=db, email=test_user_email, purpose="signup", expiry_minutes=10)
        assert len(otp_1) == 6 and otp_1.isdigit(), f"Invalid OTP format: {otp_1}"
        print(f"  [PASS] Generated 6-digit Signup OTP: {otp_1}")

        # Check DB record
        record_1 = db.query(VerificationCode).filter(
            VerificationCode.email == test_user_email,
            VerificationCode.purpose == "signup",
            VerificationCode.used == False
        ).first()
        assert record_1 is not None, "VerificationCode record not found in database!"
        assert record_1.used is False, "Record marked used prematurely!"
        print("  [PASS] VerificationCode record verified in database.")

        # Test Wrong OTP
        print("  Testing wrong OTP rejection...")
        wrong_ok, wrong_msg = verify_otp(db=db, email=test_user_email, code="000000", purpose="signup")
        assert wrong_ok is False, "Wrong OTP was erroneously accepted!"
        assert "Invalid verification code" in wrong_msg
        print("  [PASS] Wrong OTP properly rejected and attempt logged.")

        # Test Resend Rate Limit
        print("  Testing Resend Rate Limit...")
        allowed_resend, remaining_cd = can_resend_otp(db=db, email=test_user_email, purpose="signup", cooldown_seconds=60)
        assert allowed_resend is False, "Cooldown was not enforced on immediate resend!"
        print(f"  [PASS] Resend rate limit enforced ({remaining_cd}s remaining).")

        # Invalidate and generate fresh OTP
        otp_2 = generate_and_save_otp(db=db, email=test_user_email, purpose="signup", expiry_minutes=10)
        print(f"  [PASS] Generated fresh Signup OTP: {otp_2}")

        # Verify old OTP is invalidated
        old_ok, old_msg = verify_otp(db=db, email=test_user_email, code=otp_1, purpose="signup")
        assert old_ok is False, "Previous OTP was accepted after generating fresh code!"
        print("  [PASS] Previous OTP is invalidated upon generating fresh code.")

        # Verify correct OTP
        valid_ok, valid_msg = verify_otp(db=db, email=test_user_email, code=otp_2, purpose="signup")
        assert valid_ok is True, f"Valid OTP verification failed: {valid_msg}"
        print("  [PASS] Valid OTP verified successfully.")

        # Verify single-use (Cannot reuse verified OTP)
        reuse_ok, reuse_msg = verify_otp(db=db, email=test_user_email, code=otp_2, purpose="signup")
        assert reuse_ok is False, "OTP reuse was allowed!"
        print("  [PASS] OTP reuse prevented (single-use enforced).")

        # Activate user
        new_user.is_active = True
        new_user.last_login = datetime.utcnow()
        db.commit()

        # TEST 4: Forgot Password Flow & Purpose Isolation
        print(f"\n[TEST 4] Testing Forgot Password OTP Flow for '{test_user_email}'...")
        fp_otp = generate_and_save_otp(db=db, email=test_user_email, purpose="forgot_password", expiry_minutes=10)
        print(f"  [PASS] Generated 6-digit Forgot-Password OTP: {fp_otp}")

        # Test Purpose Isolation: Try verifying forgot_password code as signup code
        cross_ok, cross_msg = verify_otp(db=db, email=test_user_email, code=fp_otp, purpose="signup")
        assert cross_ok is False, "Purpose isolation failed: Forgot-password OTP accepted for signup!"
        print("  [PASS] Purpose isolation verified (forgot_password code rejected for signup).")

        # Verify forgot-password OTP
        fp_valid, fp_msg = verify_otp(db=db, email=test_user_email, code=fp_otp, purpose="forgot_password")
        assert fp_valid is True, f"Forgot password OTP verification failed: {fp_msg}"
        print("  [PASS] Forgot password OTP verified successfully.")

        # Reset Password
        new_password_str = "BrandNewPassword2026!"
        new_user.password_hash = get_password_hash(new_password_str)
        db.commit()
        db.refresh(new_user)

        assert verify_password(new_password_str, new_user.password_hash) is True, "New password hash mismatch!"
        assert verify_password(test_password, new_user.password_hash) is False, "Old password still valid!"
        print("  [PASS] Password reset and hash verification confirmed.")

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 60)

    finally:
        # Cleanup test user & codes
        db.query(VerificationCode).filter(VerificationCode.email == test_user_email).delete()
        db.query(User).filter(User.email == test_user_email).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    run_tests()
