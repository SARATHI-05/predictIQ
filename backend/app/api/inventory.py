from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database.database import get_db
from app.models.inventory import InventoryItem, InventoryTransaction
from app.models.user import User
from app.services.inventory_service import get_inventory_summary, adjust_inventory_stock, calculate_purchase_recommendations
from app.utils.auth import get_current_user, require_admin
from app.utils.audit import log_audit_event
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/inventory", tags=["Inventory Management"])

class InventoryItemCreate(BaseModel):
    ingredient_name: str
    category: str
    unit: str
    current_stock: float = 0.0
    min_stock_level: float = 20.0
    max_stock_level: float = 500.0
    unit_cost: float = 0.0
    supplier: Optional[str] = "Primary Wholesale Partner"

class InventoryItemUpdate(BaseModel):
    ingredient_name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    current_stock: Optional[float] = None
    min_stock_level: Optional[float] = None
    max_stock_level: Optional[float] = None
    unit_cost: Optional[float] = None
    supplier: Optional[str] = None

class StockAdjustRequest(BaseModel):
    quantity: float
    transaction_type: str # 'IN', 'OUT', 'ADJUSTMENT'
    reason: str = "Standard Inventory Stock Count Adjustment"

class InventoryResponse(BaseModel):
    id: int
    ingredient_name: str
    category: str
    unit: str
    current_stock: float
    min_stock_level: float
    max_stock_level: float
    unit_cost: float
    supplier: Optional[str] = None
    last_updated: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[InventoryResponse])
def list_inventory(
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full inventory list with search and category filtering"""
    query = db.query(InventoryItem)
    if search:
        term = f"%{search}%"
        query = query.filter((InventoryItem.ingredient_name.ilike(term)) | (InventoryItem.supplier.ilike(term)))
    if category and category != "All":
        query = query.filter(InventoryItem.category == category)

    return query.order_by(InventoryItem.category, InventoryItem.ingredient_name).all()

@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get inventory stock valuation, total item counts, and low-stock count"""
    return get_inventory_summary(db)

@router.get("/low-stock")
def get_low_stock_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of ingredients currently below minimum stock threshold"""
    items = db.query(InventoryItem).filter(InventoryItem.current_stock <= InventoryItem.min_stock_level).all()
    return items

@router.get("/purchase-recommendations")
def get_recommendations(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Feature 14: Dynamic Purchase Recommendations based on predicted demand + recipe resources + current stock
    """
    return calculate_purchase_recommendations(db, target_food_category=category)

@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: InventoryItemCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Add a new inventory ingredient track item"""
    existing = db.query(InventoryItem).filter(InventoryItem.ingredient_name == item_in.ingredient_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ingredient '{item_in.ingredient_name}' already exists in inventory")

    new_item = InventoryItem(
        ingredient_name=item_in.ingredient_name,
        category=item_in.category,
        unit=item_in.unit,
        current_stock=item_in.current_stock,
        min_stock_level=item_in.min_stock_level,
        max_stock_level=item_in.max_stock_level,
        unit_cost=item_in.unit_cost,
        supplier=item_in.supplier
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    log_audit_event(
        db=db,
        action="INVENTORY_ITEM_CREATED",
        module="Inventory",
        description=f"Created inventory item {new_item.ingredient_name} ({new_item.current_stock} {new_item.unit})",
        user=current_user,
        record_id=str(new_item.id),
        request=request
    )

    return new_item

@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(
    item_id: int,
    item_in: InventoryItemUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update inventory ingredient details"""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    for field, value in item_in.dict(exclude_unset=True).items():
        setattr(item, field, value)

    item.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(item)

    log_audit_event(
        db=db,
        action="INVENTORY_ITEM_UPDATED",
        module="Inventory",
        description=f"Updated inventory item {item.ingredient_name}",
        user=current_user,
        record_id=str(item.id),
        request=request
    )

    return item

@router.post("/{item_id}/adjust", response_model=InventoryResponse)
def adjust_stock(
    item_id: int,
    req: StockAdjustRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Adjust ingredient stock (Restock / Dispense / Correction) and log transaction"""
    try:
        updated_item = adjust_inventory_stock(
            db=db,
            inventory_id=item_id,
            quantity_change=req.quantity,
            transaction_type=req.transaction_type,
            reason=req.reason,
            performed_by=current_user.name
        )

        log_audit_event(
            db=db,
            action=f"INVENTORY_STOCK_{req.transaction_type}",
            module="Inventory",
            description=f"Adjusted {updated_item.ingredient_name} stock: {req.transaction_type} {req.quantity} {updated_item.unit}. Reason: {req.reason}",
            user=current_user,
            record_id=str(updated_item.id),
            request=request
        )

        return updated_item
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_inventory_item(
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete an inventory item"""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    name = item.ingredient_name
    db.delete(item)
    db.commit()

    log_audit_event(
        db=db,
        action="INVENTORY_ITEM_DELETED",
        module="Inventory",
        description=f"Deleted inventory item {name} (ID #{item_id})",
        user=current_user,
        record_id=str(item_id),
        request=request
    )

    return {"message": f"Inventory item '{name}' deleted successfully"}
