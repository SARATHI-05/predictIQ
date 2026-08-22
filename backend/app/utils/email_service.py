# Backward-compatibility bridge forwarding to app.services.email_service
from app.services.email_service import (
    get_smtp_config,
    send_signup_verification_code,
    send_forgot_password_code,
    send_welcome_email,
    send_google_verification_email,
    _dispatch_email
)

# Aliases for legacy callers
send_verification_email = send_forgot_password_code

__all__ = [
    "get_smtp_config",
    "send_signup_verification_code",
    "send_forgot_password_code",
    "send_welcome_email",
    "send_google_verification_email",
    "send_verification_email",
    "_dispatch_email"
]

