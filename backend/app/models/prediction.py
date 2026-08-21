from sqlalchemy import Column, Integer, String, Date, Float, DateTime
from datetime import datetime
from app.database.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    prediction_date = Column(Date, nullable=False)
    food_category = Column(String(50), nullable=False)
    expected_customers = Column(Integer, nullable=False)
    predicted_demand = Column(Integer, nullable=False)
    recommended_preparation = Column(Integer, nullable=False)
    demand_level = Column(String(20), nullable=False)
    model_version = Column(String(20), default="1.0.0", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
