import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Add parent directory to sys.path to allow relative imports if run as module
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from preprocess import enrich_features, build_preprocessor, TARGET_FEATURE, CATEGORICAL_FEATURES, NUMERICAL_FEATURES

def train_model(dataset_path: str = None, df: pd.DataFrame = None, model_output_path: str = None):
    """
    Train Random Forest Regressor on food demand dataset.
    Returns metrics dictionary and trained pipeline.
    """
    if df is None:
        if dataset_path is None:
            dataset_path = os.path.join(current_dir, 'dataset.csv')
        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Dataset not found at {dataset_path}")
        df = pd.read_csv(dataset_path)

    print(f"Loaded dataset with {len(df)} rows.")

    # Clean and enrich features
    df_clean = enrich_features(df)
    
    # Ensure target column exists
    if TARGET_FEATURE not in df_clean.columns:
        if 'Food_Prepared' in df_clean.columns:
            # Fallback if only prepared is provided
            df_clean[TARGET_FEATURE] = df_clean['Food_Prepared'] * 0.95
        else:
            raise ValueError(f"Target column {TARGET_FEATURE} missing from dataset.")

    # Drop rows with NaN in target or features
    df_clean = df_clean.dropna(subset=[TARGET_FEATURE] + CATEGORICAL_FEATURES + NUMERICAL_FEATURES)
    
    X = df_clean[CATEGORICAL_FEATURES + NUMERICAL_FEATURES]
    y = df_clean[TARGET_FEATURE]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = build_preprocessor()
    model = RandomForestRegressor(n_estimators=120, max_depth=12, random_state=42, n_jobs=-1)

    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', model)
    ])

    print("Training Random Forest Regressor pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)

    metrics = {
        'model_name': 'RandomForestRegressor',
        'dataset_size': int(len(df_clean)),
        'mae': round(float(mae), 2),
        'rmse': round(float(rmse), 2),
        'r2_score': round(float(r2), 4),
        'model_version': '1.0.0'
    }

    print("=== Model Training Evaluation ===")
    print(f"MAE:      {metrics['mae']} meals")
    print(f"RMSE:     {metrics['rmse']} meals")
    print(f"R² Score: {metrics['r2_score']}")

    # Save model
    if model_output_path is None:
        model_output_path = os.path.join(current_dir, 'model.pkl')
    
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(pipeline, model_output_path)
    print(f"Model saved successfully to: {model_output_path}")

    return pipeline, metrics

if __name__ == '__main__':
    train_model()
