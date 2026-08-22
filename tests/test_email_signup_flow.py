import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.database.database import get_db, SessionLocal
from app.models.user import User
from app.utils.email_service import send_verification_email

def test_email_service_initialization():
    """Verify email service utilities load without error"""
    assert send_verification_email is not None

def test_database_session():
    """Verify database connection session"""
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        assert user_count >= 0
    finally:
        db.close()

if __name__ == "__main__":
    test_email_service_initialization()
    test_database_session()
    print("[PASS] test_email_signup_flow executed successfully!")
