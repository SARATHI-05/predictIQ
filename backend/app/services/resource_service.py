from sqlalchemy.orm import Session
from app.models.resource import Resource, ResourcePlan
from typing import List, Dict, Any

def calculate_resource_plan(db: Session, food_category: str, target_meals: int) -> Dict[str, Any]:
    """Calculate required ingredients and costs for a given target meal count"""
    resources = db.query(Resource).filter(Resource.food_category == food_category).all()
    
    # If no resources found for specific category, fallback to all or generic
    if not resources:
        resources = db.query(Resource).all()

    items = []
    total_cost = 0.0

    for res in resources:
        req_qty = round(res.quantity_per_unit * target_meals, 2)
        additional_needed = max(0.0, round(req_qty - res.current_inventory, 2))
        est_cost = round(req_qty * res.cost_per_unit, 2)
        total_cost += est_cost

        items.append({
            'ingredient_name': res.ingredient_name,
            'quantity_per_meal': res.quantity_per_unit,
            'unit': res.unit,
            'required_quantity': req_qty,
            'current_inventory': res.current_inventory,
            'additional_required': additional_needed,
            'cost_per_unit': res.cost_per_unit,
            'estimated_cost': est_cost
        })

    return {
        'food_category': food_category,
        'target_meals': target_meals,
        'total_estimated_cost': round(total_cost, 2),
        'ingredients': items
    }
