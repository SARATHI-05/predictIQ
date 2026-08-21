from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class PredictionRequest(BaseModel):
    date: date
    food_category: str
    expected_customers: int = Field(..., ge=1)
    holiday: Optional[str] = "No"
    special_event: Optional[str] = "No"
    weather: Optional[str] = "Sunny"
    planned_preparation: Optional[int] = None

class PredictionUpdate(BaseModel):
    prediction_date: Optional[date] = None
    food_category: Optional[str] = None
    expected_customers: Optional[int] = None
    predicted_demand: Optional[int] = None
    recommended_preparation: Optional[int] = None
    demand_level: Optional[str] = None

class PredictionActualUpdate(BaseModel):
    actual_consumed: int = Field(..., ge=0)
    prediction_date: Optional[date] = None
    food_category: Optional[str] = None

class PredictionBulkDeleteRequest(BaseModel):
    ids: List[int]

class IngredientRequirement(BaseModel):
    ingredient_name: str
    quantity_per_meal: float
    required_quantity: float
    unit: str
    current_inventory: float
    additional_required: float
    estimated_cost: float

class PredictionResponse(BaseModel):
    id: Optional[int] = None
    prediction_date: str
    day_of_week: str
    food_category: str
    expected_customers: int
    predicted_demand: int
    recommended_preparation: int
    expected_wastage: int
    wastage_percent: float
    demand_level: str
    surplus_detected: bool = False
    surplus_meals: int = 0
    surplus_severity: str = "Low"
    surplus_message: str = ""
    model_version: str = "1.0.0"
    total_estimated_ingredient_cost: Optional[float] = 0.0
    ingredients: Optional[List[IngredientRequirement]] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ModelMetricResponse(BaseModel):
    id: int
    model_name: str
    mae: float
    rmse: float
    r2_score: float
    training_date: Optional[datetime] = None
    dataset_size: int
    model_version: str

    class Config:
        from_attributes = True
