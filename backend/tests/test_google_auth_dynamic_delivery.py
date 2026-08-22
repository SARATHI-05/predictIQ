import os
import sys
import secrets
from datetime import datetime, timedelta

backend_dir = r"c:\Users\Sarathi\predictIQ\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.verification_code import VerificationCode
from app.services.email_service import (
    get_smtp_config,
    send_google_verification_email,
    send_welcome_email
)
from app.services.otp_service import (
    generate_and_save_otp,
    verify_otp,
    can_resend_otp
)
from app.utils.firebase_auth import verify_firebase_id_token
from fastapi import HTTPException

def run_tests():
    print("=" * 65)
    print("RUNNING GOOGLE AUTH & DYNAMIC SMTP RECIPIENT VERIFICATION TESTS")
    print("=" * 65)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    account_a_email = f"user_a_{secrets.token_hex(3)}@predictiq-test.com"
    account_b_email = f"user_b_{secrets.token_hex(3)}@predictiq-test.com"

    try:
        # TEST 1: SMTP Config verification
        print("\n[TEST 1] Verifying SMTP Sender Config...")
        config = get_smtp_config()
        assert config["from_email"] == "predictiqfoodmanagement@gmail.com", f"Wrong from_email: {config['from_email']}"
        assert config["from_name"] == "PredictIQ"
        print(f"  [PASS] SMTP Sender is strictly: {config['from_name']} <{config['from_email']}>")

        # TEST 2: Invalid & Missing Token Handling
        print("\n[TEST 2] Testing Invalid & Missing Token Rejection...")
        try:
            verify_firebase_id_token("")
            assert False, "Empty token should have been rejected!"
        except HTTPException as e:
            assert e.status_code == 400
            print("  [PASS] Empty token rejected with HTTP 400.")

        try:
            verify_firebase_id_token("invalid_malformed_token_xyz")
            assert False, "Malformed token should have been rejected!"
        except HTTPException as e:
            assert e.status_code == 401
            print("  [PASS] Malformed token rejected with HTTP 401.")

        # TEST 3: Dynamic Email Extraction & Isolation for Account A vs Account B
        print("\n[TEST 3] Testing Dynamic Token Email Extraction & OTP Generation...")

        # Account A Token Simulation
        token_info_a = verify_firebase_id_token("demo_google_admin")
        email_a = token_info_a.get("email")
        assert email_a == "sarathi.google@predictiq.com"
        print(f"  [PASS] Extracted verified email from Token A: {email_a}")

        # Account B Token Simulation
        token_info_b = verify_firebase_id_token("demo_google_staff")
        email_b = token_info_b.get("email")
        assert email_b == "chef.alex.google@predictiq.com"
        print(f"  [PASS] Extracted verified email from Token B: {email_b}")

        # Verify distinct identities
        assert email_a != email_b, "Account A and Account B extracted identical email addresses!"
        print("  [PASS] Account A and Account B verified emails are completely distinct.")

        # TEST 4: Purpose Isolation & OTP Lifecycle for Account A vs Account B
        print("\n[TEST 4] Testing Account A & Account B OTP Isolation...")

        otp_a = generate_and_save_otp(db=db, email=account_a_email, purpose="google_signup", expiry_minutes=10)
        otp_b = generate_and_save_otp(db=db, email=account_b_email, purpose="google_signup", expiry_minutes=10)
        
        print(f"  Account A ({account_a_email}) OTP: {otp_a}")
        print(f"  Account B ({account_b_email}) OTP: {otp_b}")

        # Cross-Account OTP Rejection: Account B cannot use Account A's OTP
        print("  Testing cross-account OTP rejection...")
        cross_ok, cross_err = verify_otp(db=db, email=account_b_email, code=otp_a, purpose="google_signup")
        assert cross_ok is False, "Security breach: Account B was able to verify using Account A's OTP!"
        print("  [PASS] Cross-account OTP usage properly rejected.")

        # Purpose Isolation: Google Signup OTP cannot be used for Password Reset
        print("  Testing cross-purpose rejection...")
        fp_cross_ok, fp_cross_err = verify_otp(db=db, email=account_a_email, code=otp_a, purpose="forgot_password")
        assert fp_cross_ok is False, "Security breach: google_signup OTP was accepted for forgot_password!"
        print("  [PASS] Google signup OTP rejected for forgot-password.")

        # Valid Verification for Account A
        val_a_ok, val_a_msg = verify_otp(db=db, email=account_a_email, code=otp_a, purpose="google_signup")
        assert val_a_ok is True, f"Account A verification failed: {val_a_msg}"
        print("  [PASS] Account A verified successfully with its own OTP.")

        # Valid Verification for Account B
        val_b_ok, val_b_msg = verify_otp(db=db, email=account_b_email, code=otp_b, purpose="google_signup")
        assert val_b_ok is True, f"Account B verification failed: {val_b_msg}"
        print("  [PASS] Account B verified successfully with its own OTP.")

        # Single-Use Enforcement
        reuse_ok, _ = verify_otp(db=db, email=account_a_email, code=otp_a, purpose="google_signup")
        assert reuse_ok is False, "Single-use enforcement failed: Account A OTP was reused!"
        print("  [PASS] Single-use OTP enforcement confirmed.")

        print("\n" + "=" * 65)
        print("ALL GOOGLE AUTH & DYNAMIC DELIVERY TESTS PASSED (100%)!")
        print("=" * 65)

    finally:
        db.query(VerificationCode).filter(VerificationCode.email.in_([account_a_email, account_b_email])).delete()
        db.query(User).filter(User.email.in_([account_a_email, account_b_email])).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    run_tests()
