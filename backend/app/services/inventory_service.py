from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.inventory import InventoryItem, InventoryTransaction
from app.models.prediction import Prediction
from app.models.resource import Resource
from app.models.notification import Notification
from typing import List, Dict, Any, Optional
from datetime import datetime

def get_inventory_summary(db: Session) -> Dict[str, Any]:
    """Summary of current inventory stock values and low stock alerts"""
    total_items = db.query(InventoryItem).count()
    items = db.query(InventoryItem).all()
    
    total_valuation = sum(item.current_stock * item.unit_cost for item in items)
    low_stock_items = [i for i in items if i.current_stock <= i.min_stock_level]

    return {
        'total_items': total_items,
        'total_valuation': round(total_valuation, 2),
        'low_stock_count': len(low_stock_items),
        'low_stock_items': [{
            'id': i.id,
            'ingredient_name': i.ingredient_name,
            'category': i.category,
            'unit': i.unit,
            'current_stock': i.current_stock,
            'min_stock_level': i.min_stock_level,
            'shortfall': round(max(0.0, i.min_stock_level - i.current_stock), 2)
        } for i in low_stock_items]
    }

def adjust_inventory_stock(
    db: Session,
    inventory_id: int,
    quantity_change: float,
    transaction_type: str, # 'IN', 'OUT', 'ADJUSTMENT'
    reason: str,
    performed_by: str = "Staff"
) -> InventoryItem:
    """Adjust item stock and record audit transaction"""
    item = db.query(InventoryItem).filter(InventoryItem.id == inventory_id).first()
    if not item:
        raise ValueError("Inventory item not found")

    if transaction_type == 'OUT':
        item.current_stock = max(0.0, item.current_stock - quantity_change)
    elif transaction_type == 'IN':
        item.current_stock += quantity_change
    else: # Direct adjustment
        item.current_stock = max(0.0, quantity_change)

    item.last_updated = datetime.utcnow()

    # Record transaction log
    txn = InventoryTransaction(
        inventory_id=item.id,
        transaction_type=transaction_type,
        quantity=quantity_change,
        reason=reason,
        performed_by=performed_by
    )
    db.add(txn)

    # Check for low stock trigger
    if item.current_stock <= item.min_stock_level:
        notif = Notification(
            type='SHORTAGE',
            title='Low Stock Inventory Warning',
            message=f"Low Stock Alert: {item.ingredient_name} inventory ({item.current_stock} {item.unit}) is at or below the minimum threshold ({item.min_stock_level} {item.unit}).",
            severity='High',
            is_read=False
        )
        db.add(notif)

    db.commit()
    db.refresh(item)
    return item

def calculate_purchase_recommendations(db: Session, target_food_category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Calculate purchase recommendations combining:
    Predicted Demand + Resource Requirement + Current Inventory Level
    Formula: Recommended Purchase = max(0, Required Quantity + Min Stock - Current Stock)
    """
    # 1. Fetch latest prediction or active recipe resources
    query = db.query(Resource)
    if target_food_category and target_food_category != 'All':
        query = query.filter(Resource.food_category == target_food_category)

    recipe_resources = query.all()
    recommendations = []

    for res in recipe_resources:
        # Match with inventory item
        inv_item = db.query(InventoryItem).filter(
            func.lower(InventoryItem.ingredient_name) == func.lower(res.ingredient_name)
        ).first()

        current_stock = inv_item.current_stock if inv_item else res.current_inventory
        min_stock = inv_item.min_stock_level if inv_item else 20.0
        unit_cost = inv_item.unit_cost if inv_item else res.cost_per_unit
        unit = inv_item.unit if inv_item else res.unit

        # Based on average batch of 500 meals or latest demand
        batch_size = 500
        req_for_batch = round(res.quantity_per_unit * batch_size, 2)
        
        # Recommended purchase quantity
        recommended_purchase = max(0.0, round((req_for_batch + min_stock) - current_stock, 2))
        est_purchase_cost = round(recommended_purchase * unit_cost, 2)

        recommendations.append({
            'ingredient_name': res.ingredient_name,
            'food_category': res.food_category,
            'unit': unit,
            'current_stock': current_stock,
            'min_stock_level': min_stock,
            'standard_batch_demand': req_for_batch,
            'recommended_purchase_quantity': recommended_purchase,
            'unit_cost': unit_cost,
            'estimated_total_cost': est_purchase_cost,
            'urgency': 'Urgent' if current_stock < min_stock else ('Moderate' if recommended_purchase > 0 else 'Stocked')
        })

    return sorted(recommendations, key=lambda x: (x['urgency'] != 'Urgent', -x['recommended_purchase_quantity']))
