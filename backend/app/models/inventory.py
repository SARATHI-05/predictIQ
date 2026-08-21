from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base

class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_name = Column(String(100), nullable=False, unique=True, index=True)
    category = Column(String(50), nullable=False, index=True) # e.g. Grains, Dairy, Meat/Protein, Vegetables, Spices, Oils
    unit = Column(String(20), nullable=False) # kg, liters, grams, units
    current_stock = Column(Float, default=0.0, nullable=False)
    min_stock_level = Column(Float, default=20.0, nullable=False)
    max_stock_level = Column(Float, default=500.0, nullable=False)
    unit_cost = Column(Float, default=0.0, nullable=False)
    supplier = Column(String(100), default="Primary Wholesale Partner", nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("InventoryTransaction", back_populates="item", cascade="all, delete-orphan")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False)
    transaction_type = Column(String(20), nullable=False) # 'IN', 'OUT', 'ADJUSTMENT'
    quantity = Column(Float, nullable=False)
    reason = Column(String(255), default="Manual Update", nullable=True)
    performed_by = Column(String(100), default="System", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("InventoryItem", back_populates="transactions")
