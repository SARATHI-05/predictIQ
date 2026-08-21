from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class BulkDeleteRequest(BaseModel):
    ids: List[int]

class FoodRecordBase(BaseModel):
    date: date
    food_category: str
    food_prepared: int = Field(..., ge=0)
    food_consumed: int = Field(..., ge=0)
    leftover: Optional[int] = 0
    expected_customers: int = Field(..., ge=0)
    holiday: Optional[str] = "No"
    special_event: Optional[str] = "No"
    weather: Optional[str] = "Sunny"

class FoodRecordCreate(FoodRecordBase):
    pass

class FoodRecordUpdate(BaseModel):
    date: Optional[date] = None
    food_category: Optional[str] = None
    food_prepared: Optional[int] = None
    food_consumed: Optional[int] = None
    leftover: Optional[int] = None
    expected_customers: Optional[int] = None
    holiday: Optional[str] = None
    special_event: Optional[str] = None
    weather: Optional[str] = None

class FoodRecordResponse(FoodRecordBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
