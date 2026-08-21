import os
import sys
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.prediction import Prediction
from app.models.resource import Resource, ResourcePlan
from app.models.alert import Alert
from app.models.notification import Notification

# Import ML model functions
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ml_dir = os.path.join(root_dir, "ml")
if ml_dir not in sys.path:
    sys.path.append(ml_dir)

from predict import predict_demand as ml_predict_demand

def run_prediction(db: Session, request_data: dict, save_to_db: bool = True) -> dict:
    """
    Execute ML prediction pipeline, link with resource calculations,
    and persist results to database.
    """
    model_path = os.path.join(ml_dir, "model.pkl")
    prediction_result = ml_predict_demand(request_data, model_path=model_path)

    category = prediction_result['food_category']
    predicted_demand = prediction_result['predicted_demand']
    rec_prep = prediction_result['recommended_preparation']

    # Query resources for this category to compute ingredient breakdown
    resources = db.query(Resource).filter(Resource.food_category == category).all()
    
    ingredient_list = []
    total_cost = 0.0

    for res in resources:
        req_qty = round(res.quantity_per_unit * rec_prep, 2)
        additional_needed = max(0.0, round(req_qty - res.current_inventory, 2))
        est_cost = round(req_qty * res.cost_per_unit, 2)
        total_cost += est_cost

        ingredient_list.append({
            'ingredient_name': res.ingredient_name,
            'quantity_per_meal': res.quantity_per_unit,
            'unit': res.unit,
            'required_quantity': req_qty,
            'current_inventory': res.current_inventory,
            'additional_required': additional_needed,
            'estimated_cost': est_cost
        })

    prediction_result['ingredients'] = ingredient_list
    prediction_result['total_estimated_ingredient_cost'] = round(total_cost, 2)

    pred_record = None
    if save_to_db:
        # Convert date string/date object
        p_date = request_data.get('date')
        if isinstance(p_date, str):
            p_date = datetime.strptime(p_date, "%Y-%m-%d").date()
            
        pred_record = Prediction(
            prediction_date=p_date,
            food_category=category,
            expected_customers=prediction_result['expected_customers'],
            predicted_demand=predicted_demand,
            recommended_preparation=rec_prep,
            demand_level=prediction_result['demand_level'],
            model_version=prediction_result.get('model_version', '1.0.0')
        )
        db.add(pred_record)
        db.commit()
        db.refresh(pred_record)
        prediction_result['id'] = pred_record.id
        prediction_result['created_at'] = pred_record.created_at

        # Also store resource plans
        for item in ingredient_list:
            res_plan = ResourcePlan(
                prediction_id=pred_record.id,
                ingredient_name=item['ingredient_name'],
                required_quantity=item['required_quantity'],
                available_quantity=item['current_inventory'],
                additional_quantity=item['additional_required'],
                estimated_cost=item['estimated_cost']
            )
            db.add(res_plan)
        
        # Trigger surplus alert & notification if detected
        if prediction_result.get('surplus_detected'):
            alert = Alert(
                alert_type="Surplus",
                message=prediction_result['surplus_message'],
                severity=prediction_result['surplus_severity'],
                is_read=False
            )
            db.add(alert)

            notif = Notification(
                type="SURPLUS",
                title=f"Food Surplus Warning: {category}",
                message=prediction_result['surplus_message'],
                severity=prediction_result['surplus_severity'],
                is_read=False
            )
            db.add(notif)

        db.commit()

    return prediction_result
