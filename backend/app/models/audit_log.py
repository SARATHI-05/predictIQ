from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    user_email = Column(String(150), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    module = Column(String(50), nullable=False, index=True)
    record_id = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    ip_address = Column(String(50), default="127.0.0.1", nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
