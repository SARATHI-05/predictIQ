from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime
from app.database.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    type = Column(String(50), nullable=False, index=True)  # 'HIGH_DEMAND', 'LOW_DEMAND', 'HIGH_WASTAGE', 'SURPLUS', 'SHORTAGE', 'UPLOAD', 'ML_TRAINING', 'REPORT'
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="Medium", nullable=False)  # 'Low', 'Medium', 'High', 'Critical'
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
