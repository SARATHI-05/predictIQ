import os
import sys
import pandas as pd
import numpy as np
import joblib

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from preprocess import enrich_features, CATEGORICAL_FEATURES, NUMERICAL_FEATURES

_model_cache = None

def get_model(model_path: str = None):
    global _model_cache
    if model_path is None:
        model_path = os.path.join(current_dir, 'model.pkl')
    if _model_cache is None or not os.path.exists(model_path):
        if not os.path.exists(model_path):
            # Train model if missing
            from train import train_model
            pipeline, _ = train_model(model_output_path=model_path)
            _model_cache = pipeline
        else:
            _model_cache = joblib.load(model_path)
    return _model_cache

def predict_demand(input_data: dict, model_path: str = None) -> dict:
    """
    Predict food demand from scenario input.
    Input dict fields:
      - date (YYYY-MM-DD)
      - food_category
      - expected_customers
      - holiday ('Yes'/'No')
      - special_event ('Yes'/'No')
      - weather ('Sunny'/'Rainy'/etc)
      - planned_preparation (optional, to calculate surplus alert)
    """
    model = get_model(model_path)

    df_in = pd.DataFrame([{
        'Date': input_data.get('date') or input_data.get('Date') or '2026-08-18',
        'Food_Category': input_data.get('food_category') or input_data.get('Food_Category') or 'Meals',
        'Expected_Customers': float(input_data.get('expected_customers') or input_data.get('Expected_Customers') or 100),
        'Holiday': input_data.get('holiday') or input_data.get('Holiday') or 'No',
        'Special_Event': input_data.get('special_event') or input_data.get('Special_Event') or 'No',
        'Weather': input_data.get('weather') or input_data.get('Weather') or 'Sunny'
    }])

    df_enriched = enrich_features(df_in)
    X = df_enriched[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]

    raw_pred = float(model.predict(X)[0])
    predicted_demand = max(10, int(round(raw_pred)))

    # Recommended preparation includes an intelligent 5-7% safety buffer to prevent stockouts
    category = df_enriched['Food_Category'].iloc[0]
    buffer_percent = 0.06
    if category in ['Biryani', 'Dinner']:
        buffer_percent = 0.08
    elif category == 'Breakfast':
        buffer_percent = 0.05

    recommended_prep = int(round(predicted_demand * (1 + buffer_percent)))
    expected_wastage = recommended_prep - predicted_demand
    wastage_percent = round((expected_wastage / recommended_prep) * 100, 1)

    # Determine Demand Level
    cust = float(df_enriched['Expected_Customers'].iloc[0])
    if predicted_demand > 450 or (predicted_demand / max(1, cust) > 1.05):
        demand_level = 'Peak'
    elif predicted_demand >= 350:
        demand_level = 'High'
    elif predicted_demand >= 200:
        demand_level = 'Moderate'
    else:
        demand_level = 'Low'

    # Surplus Alert Calculation
    planned_prep = input_data.get('planned_preparation')
    surplus_detected = False
    surplus_meals = 0
    surplus_message = ""
    surplus_severity = "Low"

    if planned_prep is not None and str(planned_prep).strip() != "":
        try:
            planned_prep = int(planned_prep)
            if planned_prep > predicted_demand or planned_prep > recommended_prep:
                excess_meals = planned_prep - predicted_demand
                if excess_meals >= 10:
                    surplus_detected = True
                    surplus_meals = excess_meals
                    if surplus_meals >= 50:
                        surplus_severity = "High"
                    elif surplus_meals >= 20:
                        surplus_severity = "Medium"
                    else:
                        surplus_severity = "Low"
                    surplus_message = (
                        f"Surplus Alert: Expected ~{surplus_meals} excess {category} meals based on planned preparation "
                        f"of {planned_prep} (Recommended: {recommended_prep}, Forecast Demand: {predicted_demand}). "
                        f"Recommended: Adjust batch cook size or schedule donation pickup via Food Recovery Partners."
                    )
        except (ValueError, TypeError):
            pass

    return {
        'prediction_date': df_enriched['Date'].iloc[0].strftime('%Y-%m-%d'),
        'day_of_week': df_enriched['Day_of_Week'].iloc[0],
        'food_category': category,
        'expected_customers': int(cust),
        'predicted_demand': predicted_demand,
        'recommended_preparation': recommended_prep,
        'expected_wastage': expected_wastage,
        'wastage_percent': wastage_percent,
        'demand_level': demand_level,
        'surplus_detected': surplus_detected,
        'surplus_meals': surplus_meals,
        'surplus_severity': surplus_severity,
        'surplus_message': surplus_message,
        'model_version': '1.0.0'
    }

if __name__ == '__main__':
    test_input = {
        'date': '2026-08-20',
        'food_category': 'Biryani',
        'expected_customers': 450,
        'holiday': 'No',
        'special_event': 'Yes',
        'weather': 'Sunny',
        'planned_preparation': 520
    }
    result = predict_demand(test_input)
    print("Sample Prediction Result:")
    for k, v in result.items():
        print(f"  {k}: {v}")
