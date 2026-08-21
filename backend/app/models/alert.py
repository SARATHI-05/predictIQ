from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime
from app.database.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False) # 'Surplus', 'Shortage', 'System', 'Storage'
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="Medium", nullable=False) # 'Low', 'Medium', 'High', 'Critical'
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
