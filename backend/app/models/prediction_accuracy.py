from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from datetime import datetime
from app.database.database import Base

class PredictionAccuracy(Base):
    __tablename__ = "prediction_accuracy"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="CASCADE"), nullable=True)
    food_record_id = Column(Integer, ForeignKey("food_records.id", ondelete="SET NULL"), nullable=True)
    prediction_date = Column(Date, nullable=False, index=True)
    food_category = Column(String(50), nullable=False, index=True)
    predicted_demand = Column(Integer, nullable=False)
    actual_consumed = Column(Integer, nullable=False)
    error = Column(Float, nullable=False) # predicted - actual
    abs_error = Column(Float, nullable=False) # |predicted - actual|
    percentage_error = Column(Float, nullable=False) # (|predicted - actual| / actual) * 100
    accuracy_score = Column(Float, nullable=False) # max(0, 100 - percentage_error)
    created_at = Column(DateTime, default=datetime.utcnow)
