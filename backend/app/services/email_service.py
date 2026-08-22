# Re-export email service functions from app.utils.email_service
from app.utils.email_service import send_verification_email, send_welcome_email

__all__ = ["send_verification_email", "send_welcome_email"]
