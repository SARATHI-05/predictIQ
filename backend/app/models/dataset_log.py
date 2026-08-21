from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database.database import Base

class DatasetLog(Base):
    __tablename__ = "dataset_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    rows_count = Column(Integer, nullable=False)
    uploaded_by = Column(String(100), default="Admin", nullable=False)
    status = Column(String(50), default="Success", nullable=False)
    storage_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
