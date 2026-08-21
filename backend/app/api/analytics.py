from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.services.analytics_service import get_analytics_insights
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("")
@router.get("/insights")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve deep analytics insights (peak days, highest/lowest demand, weather correlation, category performance, and smart wastage insights)"""
    return get_analytics_insights(db=db)
