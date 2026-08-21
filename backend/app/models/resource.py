from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    food_category = Column(String(50), nullable=False, index=True)
    ingredient_name = Column(String(100), nullable=False)
    quantity_per_unit = Column(Float, nullable=False)  # e.g., 0.08 kg per meal
    unit = Column(String(20), nullable=False)          # kg, liters, grams, units
    cost_per_unit = Column(Float, nullable=False)      # cost per kg/liter
    current_inventory = Column(Float, default=50.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ResourcePlan(Base):
    __tablename__ = "resource_plans"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    ingredient_name = Column(String(100), nullable=False)
    required_quantity = Column(Float, nullable=False)
    available_quantity = Column(Float, nullable=False)
    additional_quantity = Column(Float, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
