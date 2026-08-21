from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
from typing import Optional
from datetime import date
from app.database.database import get_db
from app.models.prediction import Prediction
from app.models.resource import Resource, ResourcePlan
from app.models.food_record import FoodRecord
from app.models.prediction_accuracy import PredictionAccuracy
from app.models.user import User
from app.schemas.prediction import (
    PredictionRequest, 
    PredictionResponse, 
    PredictionUpdate, 
    PredictionActualUpdate, 
    PredictionBulkDeleteRequest
)
from app.schemas.common import PaginatedResponse
from app.services.prediction_service import run_prediction
from app.utils.auth import get_current_user, require_admin
from app.utils.audit import log_audit_event
from app.utils.notification_helper import create_notification

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])

@router.post("", response_model=PredictionResponse)
def create_prediction(
    pred_in: PredictionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate real ML food demand prediction, calculate recommended preparation,
    estimate wastage, compute required ingredient raw materials, and detect surplus risks.
    """
    request_data = pred_in.dict()
    result = run_prediction(db=db, request_data=request_data, save_to_db=True)

    log_audit_event(
        db=db,
        action="PREDICTION_GENERATED",
        module="Predictions",
        description=f"Generated ML prediction for {result['food_category']} on {result['prediction_date']}: Demand={result['predicted_demand']} meals (Level: {result['demand_level']})",
        user=current_user,
        record_id=str(result.get('id', '')),
        request=request
    )

    if result.get('demand_level') in ['High', 'Peak']:
        create_notification(
            db=db,
            type="HIGH_DEMAND",
            title=f"{result['demand_level']} Demand Alert: {result['food_category']}",
            message=f"Predicted high volume of {result['predicted_demand']} meals for {result['food_category']} on {result['prediction_date']}.",
            severity="Medium" if result['demand_level'] == 'High' else 'High'
        )

    return result

@router.get("", response_model=PaginatedResponse)
def list_predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    min_demand: Optional[int] = None,
    max_demand: Optional[int] = None,
    min_customers: Optional[int] = None,
    max_customers: Optional[int] = None,
    demand_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Feature 1 & 8: Prediction History with Advanced Filtering & Actual vs Predicted Comparison
    """
    query = db.query(Prediction)

    if category and category != "All":
        query = query.filter(Prediction.food_category == category)

    if start_date:
        query = query.filter(Prediction.prediction_date >= start_date)

    if end_date:
        query = query.filter(Prediction.prediction_date <= end_date)

    if min_demand is not None:
        query = query.filter(Prediction.predicted_demand >= min_demand)

    if max_demand is not None:
        query = query.filter(Prediction.predicted_demand <= max_demand)

    if min_customers is not None:
        query = query.filter(Prediction.expected_customers >= min_customers)

    if max_customers is not None:
        query = query.filter(Prediction.expected_customers <= max_customers)

    if demand_level and demand_level != "All":
        query = query.filter(Prediction.demand_level == demand_level)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Prediction.food_category.ilike(term),
                Prediction.demand_level.ilike(term)
            )
        )

    total = query.count()
    predictions = query.order_by(Prediction.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    # Enrich prediction results with date format & actual consumption matching
    data = []
    for p in predictions:
        # Check direct linked accuracy record first
        acc_entry = db.query(PredictionAccuracy).filter(PredictionAccuracy.prediction_id == p.id).first()
        actual_consumed = None
        accuracy_pct = None

        if acc_entry and acc_entry.actual_consumed is not None:
            actual_consumed = acc_entry.actual_consumed
            accuracy_pct = acc_entry.accuracy_score
        else:
            # Cross-reference matching actual food record if available
            actual_rec = db.query(FoodRecord).filter(
                FoodRecord.date == p.prediction_date,
                func.lower(FoodRecord.food_category) == func.lower(p.food_category)
            ).first()

            if actual_rec and actual_rec.food_consumed is not None and actual_rec.food_consumed > 0:
                actual_consumed = actual_rec.food_consumed
                pct_err = abs(p.predicted_demand - actual_consumed) / max(1, actual_consumed) * 100
                accuracy_pct = max(0.0, round(100.0 - pct_err, 1))

        data.append({
            "id": p.id,
            "prediction_date": p.prediction_date.strftime("%Y-%m-%d"),
            "day_of_week": p.prediction_date.strftime("%A"),
            "food_category": p.food_category,
            "expected_customers": p.expected_customers,
            "predicted_demand": p.predicted_demand,
            "recommended_preparation": p.recommended_preparation,
            "expected_wastage": p.recommended_preparation - p.predicted_demand,
            "wastage_percent": round(((p.recommended_preparation - p.predicted_demand) / max(1, p.recommended_preparation)) * 100, 1),
            "demand_level": p.demand_level,
            "model_version": p.model_version,
            "actual_consumed": actual_consumed,
            "accuracy_percentage": accuracy_pct,
            "created_at": p.created_at
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "data": data
    }

@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction_details(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    # Fetch ingredient plans
    plans = db.query(ResourcePlan).filter(ResourcePlan.prediction_id == pred.id).all()
    ingredients = [{
        "ingredient_name": p.ingredient_name,
        "quantity_per_meal": 0.0,
        "unit": "units",
        "required_quantity": p.required_quantity,
        "current_inventory": p.available_quantity,
        "additional_required": p.additional_quantity,
        "estimated_cost": p.estimated_cost
    } for p in plans]

    waste = pred.recommended_preparation - pred.predicted_demand

    return {
        "id": pred.id,
        "prediction_date": pred.prediction_date.strftime("%Y-%m-%d"),
        "day_of_week": pred.prediction_date.strftime("%A"),
        "food_category": pred.food_category,
        "expected_customers": pred.expected_customers,
        "predicted_demand": pred.predicted_demand,
        "recommended_preparation": pred.recommended_preparation,
        "expected_wastage": waste,
        "wastage_percent": round((waste / max(1, pred.recommended_preparation)) * 100, 1),
        "demand_level": pred.demand_level,
        "model_version": pred.model_version,
        "ingredients": ingredients,
        "created_at": pred.created_at
    }

@router.put("/{prediction_id}", status_code=status.HTTP_200_OK)
def update_prediction(
    prediction_id: int,
    pred_in: PredictionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update historical prediction log parameters (category, expected customers, demand, recommended prep).
    """
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    update_data = pred_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pred, field, value)

    # Recalculate demand level if not explicitly provided
    if 'predicted_demand' in update_data and 'demand_level' not in update_data:
        d = pred.predicted_demand
        if d > 450:
            pred.demand_level = 'Peak'
        elif d >= 350:
            pred.demand_level = 'High'
        elif d >= 200:
            pred.demand_level = 'Moderate'
        else:
            pred.demand_level = 'Low'

    # If predicted_demand changed, sync linked accuracy score
    acc_entry = db.query(PredictionAccuracy).filter(PredictionAccuracy.prediction_id == pred.id).first()
    if acc_entry and acc_entry.actual_consumed is not None:
        acc_entry.predicted_demand = pred.predicted_demand
        acc_entry.error = pred.predicted_demand - acc_entry.actual_consumed
        acc_entry.abs_error = abs(acc_entry.error)
        acc_entry.percentage_error = round((acc_entry.abs_error / max(1, acc_entry.actual_consumed)) * 100, 2)
        acc_entry.accuracy_score = max(0.0, round(100.0 - acc_entry.percentage_error, 2))

    db.commit()
    db.refresh(pred)

    log_audit_event(
        db=db,
        action="PREDICTION_UPDATED",
        module="Predictions",
        description=f"Updated historical prediction #{pred.id} ({pred.food_category} for {pred.prediction_date})",
        user=current_user,
        record_id=str(pred.id),
        request=request
    )

    return {
        "message": f"Prediction #{pred.id} updated successfully",
        "id": pred.id,
        "prediction_date": pred.prediction_date.strftime("%Y-%m-%d"),
        "food_category": pred.food_category,
        "expected_customers": pred.expected_customers,
        "predicted_demand": pred.predicted_demand,
        "recommended_preparation": pred.recommended_preparation,
        "demand_level": pred.demand_level
    }

@router.put("/{prediction_id}/actual", status_code=status.HTTP_200_OK)
@router.post("/{prediction_id}/actual", status_code=status.HTTP_200_OK)
def record_prediction_actual(
    prediction_id: int,
    actual_in: PredictionActualUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record or update actual consumed meals for this prediction log,
    computing error, absolute error, percentage error and accuracy score.
    """
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    actual = actual_in.actual_consumed
    predicted = pred.predicted_demand
    error = predicted - actual
    abs_err = abs(error)
    pct_err = round((abs_err / max(1, actual)) * 100, 2)
    accuracy = max(0.0, round(100.0 - pct_err, 2))

    # Check for matching food record
    food_rec = db.query(FoodRecord).filter(
        FoodRecord.date == pred.prediction_date,
        func.lower(FoodRecord.food_category) == func.lower(pred.food_category)
    ).first()

    acc_entry = db.query(PredictionAccuracy).filter(PredictionAccuracy.prediction_id == pred.id).first()
    if not acc_entry:
        acc_entry = PredictionAccuracy(
            prediction_id=pred.id,
            food_record_id=food_rec.id if food_rec else None,
            prediction_date=pred.prediction_date,
            food_category=pred.food_category,
            predicted_demand=predicted,
            actual_consumed=actual,
            error=error,
            abs_error=abs_err,
            percentage_error=pct_err,
            accuracy_score=accuracy
        )
        db.add(acc_entry)
    else:
        acc_entry.actual_consumed = actual
        acc_entry.predicted_demand = predicted
        acc_entry.error = error
        acc_entry.abs_error = abs_err
        acc_entry.percentage_error = pct_err
        acc_entry.accuracy_score = accuracy
        if food_rec:
            acc_entry.food_record_id = food_rec.id

    db.commit()

    log_audit_event(
        db=db,
        action="PREDICTION_ACTUAL_EVALUATED",
        module="Predictions",
        description=f"Recorded actual consumption ({actual} meals) for prediction #{pred.id} ({pred.food_category}). Computed Accuracy: {accuracy}%",
        user=current_user,
        record_id=str(pred.id),
        request=request
    )

    return {
        "message": f"Successfully evaluated prediction #{pred.id}",
        "prediction_id": pred.id,
        "predicted_demand": predicted,
        "actual_consumed": actual,
        "error": error,
        "abs_error": abs_err,
        "percentage_error": pct_err,
        "accuracy_score": accuracy
    }

@router.delete("/{prediction_id}", status_code=status.HTTP_200_OK)
def delete_prediction(
    prediction_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete historical prediction log and clean up associated resource plans and accuracy logs.
    """
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found")

    pred_info = f"#{pred.id} ({pred.food_category} on {pred.prediction_date})"

    # Clean up associated resource plans & accuracy records
    db.query(ResourcePlan).filter(ResourcePlan.prediction_id == prediction_id).delete(synchronize_session=False)
    db.query(PredictionAccuracy).filter(PredictionAccuracy.prediction_id == prediction_id).delete(synchronize_session=False)

    db.delete(pred)
    db.commit()

    log_audit_event(
        db=db,
        action="PREDICTION_DELETED",
        module="Predictions",
        description=f"Deleted prediction {pred_info}",
        user=current_user,
        record_id=str(prediction_id),
        request=request
    )

    return {"message": f"Prediction {pred_info} deleted successfully"}

@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_predictions(
    bulk_in: PredictionBulkDeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Bulk delete multiple historical predictions.
    """
    if not bulk_in.ids:
        raise HTTPException(status_code=400, detail="No prediction IDs provided")

    db.query(ResourcePlan).filter(ResourcePlan.prediction_id.in_(bulk_in.ids)).delete(synchronize_session=False)
    db.query(PredictionAccuracy).filter(PredictionAccuracy.prediction_id.in_(bulk_in.ids)).delete(synchronize_session=False)
    deleted_count = db.query(Prediction).filter(Prediction.id.in_(bulk_in.ids)).delete(synchronize_session=False)
    db.commit()

    log_audit_event(
        db=db,
        action="PREDICTIONS_BULK_DELETED",
        module="Predictions",
        description=f"Bulk deleted {deleted_count} prediction logs",
        user=current_user,
        record_id="bulk",
        request=request
    )

    return {"message": f"Successfully deleted {deleted_count} prediction logs", "deleted_count": deleted_count}
