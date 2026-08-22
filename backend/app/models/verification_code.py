import hashlib
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.database.database import Base

class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), index=True, nullable=False)
    code_hash = Column(String(255), nullable=False)
    code_plain = Column(String(10), nullable=True)
    purpose = Column(String(50), nullable=False)    # 'signup', 'forgot_password', 'google_signup'
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @staticmethod
    def hash_code(code: str, email: str, purpose: str) -> str:
        payload = f"{code.strip()}:{email.strip().lower()}:{purpose.strip().lower()}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def is_valid(self, code: str, email: str, purpose: str) -> tuple[bool, str]:
        if self.used:
            return False, "This verification code has already been used."
        
        if datetime.utcnow() > self.expires_at:
            return False, "Verification code has expired. Please request a new code."

        if self.attempts >= 5:
            self.used = True
            return False, "Too many failed attempts. Please request a fresh verification code."

        target_hash = self.hash_code(code, email, purpose)
        if self.code_hash == target_hash or (self.code_plain and self.code_plain == code.strip()):
            return True, "Code valid"

        self.attempts += 1
        return False, "Invalid verification code. Please check and try again."
