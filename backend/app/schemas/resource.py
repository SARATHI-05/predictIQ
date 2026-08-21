from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ResourceBase(BaseModel):
    food_category: str
    ingredient_name: str
    quantity_per_unit: float = Field(..., gt=0)
    unit: str
    cost_per_unit: float = Field(..., ge=0)
    current_inventory: float = Field(default=50.0, ge=0)

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    food_category: Optional[str] = None
    ingredient_name: Optional[str] = None
    quantity_per_unit: Optional[float] = None
    unit: Optional[str] = None
    cost_per_unit: Optional[float] = None
    current_inventory: Optional[float] = None

class ResourceResponse(ResourceBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ResourcePlanCalculateRequest(BaseModel):
    food_category: str
    target_meals: int = Field(..., ge=1)

class ResourcePlanItem(BaseModel):
    ingredient_name: str
    quantity_per_meal: float
    unit: str
    required_quantity: float
    current_inventory: float
    additional_required: float
    cost_per_unit: float
    estimated_cost: float

class ResourcePlanResponse(BaseModel):
    food_category: str
    target_meals: int
    total_estimated_cost: float
    ingredients: list[ResourcePlanItem]
