from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.models.resource import Resource, ResourcePlan
from app.models.user import User
from app.schemas.resource import (
    ResourceCreate, ResourceUpdate, ResourceResponse,
    ResourcePlanCalculateRequest, ResourcePlanResponse
)
from app.services.resource_service import calculate_resource_plan
from app.utils.auth import get_current_user, require_admin
from app.utils.audit import log_audit_event
from app.utils.notification_helper import create_notification

router = APIRouter(prefix="/api/resources", tags=["Resources & Inventory"])

@router.get("", response_model=List[ResourceResponse])
def list_resources(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Resource)
    if category and category != "All":
        query = query.filter(Resource.food_category == category)
    return query.order_by(Resource.food_category, Resource.ingredient_name).all()

@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    res_in: ResourceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    new_res = Resource(
        food_category=res_in.food_category,
        ingredient_name=res_in.ingredient_name,
        quantity_per_unit=res_in.quantity_per_unit,
        unit=res_in.unit,
        cost_per_unit=res_in.cost_per_unit,
        current_inventory=res_in.current_inventory
    )
    db.add(new_res)
    db.commit()
    db.refresh(new_res)

    log_audit_event(
        db=db,
        action="RESOURCE_SPEC_CREATED",
        module="ResourcePlanning",
        description=f"Created recipe ingredient specification {new_res.ingredient_name} for {new_res.food_category}",
        user=current_user,
        record_id=str(new_res.id),
        request=request
    )

    return new_res

@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: int,
    res_in: ResourceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource item not found")

    for field, value in res_in.dict(exclude_unset=True).items():
        setattr(res, field, value)

    db.commit()
    db.refresh(res)

    log_audit_event(
        db=db,
        action="RESOURCE_SPEC_UPDATED",
        module="ResourcePlanning",
        description=f"Updated recipe ingredient {res.ingredient_name} ({res.food_category})",
        user=current_user,
        record_id=str(res.id),
        request=request
    )

    return res

@router.delete("/{resource_id}", status_code=status.HTTP_200_OK)
def delete_resource(
    resource_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource item not found")

    name = f"{res.ingredient_name} ({res.food_category})"
    db.delete(res)
    db.commit()

    log_audit_event(
        db=db,
        action="RESOURCE_SPEC_DELETED",
        module="ResourcePlanning",
        description=f"Deleted recipe ingredient {name}",
        user=current_user,
        record_id=str(resource_id),
        request=request
    )

    return {"message": "Resource ingredient removed successfully"}

@router.post("/calculate-plan", response_model=ResourcePlanResponse)
def calculate_plan(
    req: ResourcePlanCalculateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Feature 12: Calculate raw materials, detect resource shortages, and calculate procurement budget
    """
    plan = calculate_resource_plan(db=db, food_category=req.food_category, target_meals=req.target_meals)

    # Check for shortage notifications
    shortages = [ing for ing in plan.get('ingredients', []) if ing.get('additional_required', 0) > 0]
    if shortages:
        short_names = ", ".join(f"{s['ingredient_name']} ({s['additional_required']}{s['unit']} short)" for s in shortages[:3])
        create_notification(
            db=db,
            type="SHORTAGE",
            title=f"Resource Shortage: {req.food_category} Plan",
            message=f"Resource Shortage Detected for {req.target_meals} {req.food_category} meals: {short_names}. Immediate procurement recommended.",
            severity="High"
        )

    log_audit_event(
        db=db,
        action="RESOURCE_PLAN_GENERATED",
        module="ResourcePlanning",
        description=f"Calculated resource plan for {req.target_meals} {req.food_category} meals (Estimated Budget: ₹{plan.get('total_estimated_cost', 0)})",
        user=current_user,
        record_id=f"{req.food_category}_{req.target_meals}",
        request=request
    )

    return plan

@router.get("/plans/history")
def get_resource_plans_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ResourcePlan).order_by(ResourcePlan.id.desc()).limit(30).all()
