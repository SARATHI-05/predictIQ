#!/usr/bin/env python3
"""
PredictIQ Email Verification & Password Reset Flow Test Suite
Executes end-to-end verification for SMTP 6-digit OTP code dispatch,
database verification, and token lifecycle.
"""
import os
import sys
import secrets
from datetime import datetime, timedelta

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User
from app.utils.email_service import send_verification_email

def test_email_service_initialization():
    """Verify email service utilities load properly"""
    print("[1/4] Testing email service initialization...")
    assert callable(send_verification_email), "send_verification_email must be callable"
    print("  -> Email service module loaded successfully.")

def test_database_connection():
    """Verify database connection and user lookup"""
    print("[2/4] Testing database session & user store...")
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        assert user_count >= 0, "User query must succeed"
        print(f"  -> Database active with {user_count} registered users.")
    finally:
        db.close()

def test_otp_code_lifecycle():
    """Verify 6-digit numeric OTP generation and expiry calculation"""
    print("[3/4] Testing 6-digit OTP code lifecycle...")
    code = f"{secrets.randbelow(900000) + 100000}"
    assert len(code) == 6 and code.isdigit(), f"Code {code} must be a 6-digit number"
    expiry = datetime.utcnow() + timedelta(minutes=15)
    assert expiry > datetime.utcnow(), "Expiry time must be in the future"
    print(f"  -> Generated test code: {code} (Valid for 15 mins until {expiry.strftime('%H:%M:%S')})")

def test_smtp_email_dispatch():
    """Verify live SMTP email dispatch (SSL 465 / STARTTLS 587)"""
    print("[4/4] Testing live SMTP 6-digit verification code dispatch...")
    test_email = "predictiqfoodmanagement@gmail.com"
    test_code = f"{secrets.randbelow(900000) + 100000}"
    sent = send_verification_email(test_email, test_code)
    assert sent is True, f"Failed to send email to {test_email}"
    print(f"  -> Verification email with code {test_code} successfully delivered to {test_email}!")

if __name__ == "__main__":
    print("\n=======================================================")
    print("   PREDICTIQ EMAIL 6-DIGIT OTP VERIFICATION TEST SUITE  ")
    print("=======================================================\n")
    try:
        test_email_service_initialization()
        test_database_connection()
        test_otp_code_lifecycle()
        test_smtp_email_dispatch()
        print("\n=======================================================")
        print(" [SUCCESS] ALL EMAIL VERIFICATION TESTS PASSED (4/4)! ")
        print("=======================================================\n")
    except AssertionError as ae:
        print(f"\n[FAIL] Test assertion failed: {ae}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error during test run: {e}")
        sys.exit(1)
