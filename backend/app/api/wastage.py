from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.services.analytics_service import get_wastage_summary
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/wastage", tags=["Wastage Analysis"])

@router.get("")
def get_wastage_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve complete food wastage calculations, daily/monthly breakdown, and category stats"""
    return get_wastage_summary(db=db)
