from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    alert_type: str
    message: str
    severity: str = "Medium"

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
