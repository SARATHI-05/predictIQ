from sqlalchemy import Column, Integer, String, Date, DateTime
from datetime import datetime
from app.database.database import Base

class FoodRecord(Base):
    __tablename__ = "food_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    food_category = Column(String(50), nullable=False, index=True)
    food_prepared = Column(Integer, nullable=False)
    food_consumed = Column(Integer, nullable=False)
    leftover = Column(Integer, nullable=False)
    expected_customers = Column(Integer, nullable=False)
    holiday = Column(String(10), default="No", nullable=False)
    special_event = Column(String(10), default="No", nullable=False)
    weather = Column(String(30), default="Sunny", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
