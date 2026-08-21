from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.services.accuracy_service import get_accuracy_dashboard_metrics, evaluate_and_sync_prediction_accuracy
from app.utils.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/accuracy", tags=["Prediction Accuracy Tracking"])

@router.get("/summary")
def get_accuracy_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Feature 9: Prediction Accuracy Tracking Summary (Admin Only).
    Compares Predicted Demand vs Actual Food Consumed.
    Computes Error, Absolute Error, Percentage Error, Accuracy %.
    """
    require_admin(current_user)
    return get_accuracy_dashboard_metrics(db)

@router.get("/history")
def get_accuracy_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get full evaluation comparison history between predictions and actual food records (Admin Only)"""
    require_admin(current_user)
    metrics = get_accuracy_dashboard_metrics(db)
    return metrics.get("recent_accuracy_history", [])

@router.get("/by-category")
def get_accuracy_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get category-wise prediction accuracy rankings and error statistics (Admin Only)"""
    require_admin(current_user)
    metrics = get_accuracy_dashboard_metrics(db)
    return metrics.get("category_accuracy_rankings", [])

@router.post("/sync")
@router.get("/sync")
def sync_accuracy_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Force re-sync and recalculation of all prediction vs actual accuracy scores (Admin Only)"""
    require_admin(current_user)
    metrics = get_accuracy_dashboard_metrics(db)
    return {
        "message": "Prediction accuracy tracking metrics synchronized successfully",
        "metrics": metrics
    }
