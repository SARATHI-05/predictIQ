import os
import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from preprocess import enrich_features, build_preprocessor, TARGET_FEATURE, CATEGORICAL_FEATURES, NUMERICAL_FEATURES

def compare_models(dataset_path: str = None):
    if dataset_path is None:
        dataset_path = os.path.join(current_dir, 'dataset.csv')
    df = pd.read_csv(dataset_path)
    df_clean = enrich_features(df).dropna(subset=[TARGET_FEATURE] + CATEGORICAL_FEATURES + NUMERICAL_FEATURES)

    X = df_clean[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
    y = df_clean[TARGET_FEATURE]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    candidate_models = {
        'Random Forest Regressor': RandomForestRegressor(n_estimators=100, random_state=42),
        'Gradient Boosting Regressor': GradientBoostingRegressor(n_estimators=100, random_state=42),
        'Linear Regression': LinearRegression()
    }

    results = []
    for name, regressor in candidate_models.items():
        preprocessor = build_preprocessor()
        pipe = Pipeline([
            ('preprocessor', preprocessor),
            ('regressor', regressor)
        ])
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))

        results.append({
            'Model': name,
            'model_name': name,
            'MAE (meals)': round(mae, 2),
            'mae': round(mae, 2),
            'RMSE (meals)': round(rmse, 2),
            'rmse': round(rmse, 2),
            'R² Score': round(r2, 4),
            'r2_score': round(r2, 4),
            'r2': round(r2, 4)
        })

    results_df = pd.DataFrame(results)
    print("=== Multi-Model Benchmark Comparison ===")
    print(results_df.to_string(index=False))
    return results

if __name__ == '__main__':
    compare_models()
