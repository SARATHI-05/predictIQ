import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline

CATEGORICAL_FEATURES = ['Food_Category', 'Day_of_Week', 'Holiday', 'Special_Event', 'Weather']
NUMERICAL_FEATURES = ['Expected_Customers']
TARGET_FEATURE = 'Food_Consumed'  # We predict actual consumed food demand

VALID_CATEGORIES = ['Meals', 'Biryani', 'Breakfast', 'Snacks', 'Dinner', 'Desserts']
VALID_WEATHERS = ['Sunny', 'Rainy', 'Cloudy', 'Windy', 'Cold']
VALID_BINARY = ['Yes', 'No']

def enrich_features(df: pd.DataFrame) -> pd.DataFrame:
    """Enrich dataframe with temporal features and normalize columns"""
    df = df.copy()
    
    # Ensure column naming standard
    column_mapping = {
        'date': 'Date',
        'food_category': 'Food_Category',
        'food_prepared': 'Food_Prepared',
        'food_consumed': 'Food_Consumed',
        'leftover': 'Leftover',
        'expected_customers': 'Expected_Customers',
        'holiday': 'Holiday',
        'special_event': 'Special_Event',
        'weather': 'Weather'
    }
    df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})
    
    # Parse date if present
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
        df['Day_of_Week'] = df['Date'].dt.day_name()
    elif 'Day_of_Week' not in df.columns:
        df['Day_of_Week'] = 'Monday'
        
    # Fill missing values
    if 'Holiday' not in df.columns:
        df['Holiday'] = 'No'
    else:
        df['Holiday'] = df['Holiday'].fillna('No').astype(str).str.strip().str.capitalize()
        
    if 'Special_Event' not in df.columns:
        df['Special_Event'] = 'No'
    else:
        df['Special_Event'] = df['Special_Event'].fillna('No').astype(str).str.strip().str.capitalize()
        
    if 'Weather' not in df.columns:
        df['Weather'] = 'Sunny'
    else:
        df['Weather'] = df['Weather'].fillna('Sunny').astype(str).str.strip().str.capitalize()
        
    if 'Expected_Customers' in df.columns:
        df['Expected_Customers'] = pd.to_numeric(df['Expected_Customers'], errors='coerce').fillna(100)
    else:
        df['Expected_Customers'] = 100
        
    return df

def build_preprocessor() -> ColumnTransformer:
    """Build column transformer for categorical and numerical features"""
    categorical_transformer = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
    numerical_transformer = StandardScaler()

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', categorical_transformer, CATEGORICAL_FEATURES),
            ('num', numerical_transformer, NUMERICAL_FEATURES)
        ],
        remainder='drop'
    )
    return preprocessor
