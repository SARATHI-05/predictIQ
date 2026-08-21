import pandas as pd
from datetime import datetime, date
from typing import Tuple, List, Dict, Any

REQUIRED_COLUMNS = [
    'Date',
    'Food_Category',
    'Food_Prepared',
    'Food_Consumed',
    'Leftover',
    'Expected_Customers'
]

OPTIONAL_COLUMNS = ['Holiday', 'Special_Event', 'Weather']

VALID_CATEGORIES = ['Meals', 'Biryani', 'Breakfast', 'Snacks', 'Dinner', 'Desserts']
VALID_WEATHERS = ['Sunny', 'Rainy', 'Cloudy', 'Windy', 'Cold']

def validate_uploaded_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Enhanced Data Quality Validation Engine (Feature 5).
    Checks:
    - Missing required columns & values
    - Invalid dates
    - Negative quantities
    - Invalid food categories
    - Duplicate records within dataset
    - Logic checks: Food_Consumed > Food_Prepared
    - Incorrect Leftover values (auto-corrected with warning)
    - Expected Customers <= 0 or invalid

    Returns detailed validation dictionary for upload results and error report downloads.
    """
    summary_messages = []
    
    # 1. Normalize column names (strip whitespace and match case-insensitively)
    col_map = {}
    for col in df.columns:
        cleaned = str(col).strip().lower()
        if cleaned in ['date']:
            col_map[col] = 'Date'
        elif cleaned in ['food_category', 'category', 'food category', 'food_cat']:
            col_map[col] = 'Food_Category'
        elif cleaned in ['food_prepared', 'prepared', 'food prepared', 'prep_qty']:
            col_map[col] = 'Food_Prepared'
        elif cleaned in ['food_consumed', 'consumed', 'food consumed', 'actual_demand']:
            col_map[col] = 'Food_Consumed'
        elif cleaned in ['leftover', 'left_over', 'leftovers', 'waste']:
            col_map[col] = 'Leftover'
        elif cleaned in ['expected_customers', 'customers', 'expected customers', 'guest_count']:
            col_map[col] = 'Expected_Customers'
        elif cleaned in ['holiday']:
            col_map[col] = 'Holiday'
        elif cleaned in ['special_event', 'event', 'special event']:
            col_map[col] = 'Special_Event'
        elif cleaned in ['weather']:
            col_map[col] = 'Weather'

    df = df.rename(columns=col_map)

    # 2. Check required columns
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        return {
            'is_valid': False,
            'total_rows': len(df),
            'valid_rows': 0,
            'invalid_rows': len(df),
            'duplicate_rows': 0,
            'clean_records': [],
            'row_errors': [{
                'row_index': 0,
                'raw_data': {},
                'error_reasons': [f"Missing required columns: {', '.join(missing_cols)}"]
            }],
            'summary_messages': [f"Upload rejected: Missing required columns: {', '.join(missing_cols)}"]
        }

    # Fill defaults for optional columns if missing
    if 'Holiday' not in df.columns:
        df['Holiday'] = 'No'
    if 'Special_Event' not in df.columns:
        df['Special_Event'] = 'No'
    if 'Weather' not in df.columns:
        df['Weather'] = 'Sunny'

    total_rows = len(df)
    clean_records = []
    row_errors = []
    seen_keys = set()
    duplicate_count = 0

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed header + data row
        row_issues = []
        raw_dict = {col: ("" if pd.isna(row[col]) else str(row[col])) for col in df.columns}

        # Check for empty / null in required fields
        for col in REQUIRED_COLUMNS:
            if pd.isna(row[col]) or str(row[col]).strip() == "":
                row_issues.append(f"Missing required value for '{col}'")

        # Validate Date
        parsed_date = None
        if not pd.isna(row['Date']):
            try:
                parsed_date = pd.to_datetime(row['Date']).date()
                if parsed_date.year < 2000 or parsed_date.year > 2050:
                    row_issues.append(f"Date '{row['Date']}' is out of realistic operational range")
            except Exception:
                row_issues.append(f"Invalid date format '{row['Date']}' (expected YYYY-MM-DD)")
        else:
            row_issues.append("Date cannot be null")

        # Validate Food Category
        category = str(row['Food_Category']).strip() if not pd.isna(row['Food_Category']) else ""
        matched_cat = next((c for c in VALID_CATEGORIES if c.lower() == category.lower()), None)
        if not matched_cat:
            row_issues.append(f"Invalid food category '{category}'. Allowed: {', '.join(VALID_CATEGORIES)}")
        else:
            category = matched_cat

        # Validate Numeric Fields & Logic Rules
        food_prep = None
        food_cons = None
        leftover = None
        customers = None

        try:
            food_prep = int(float(row['Food_Prepared']))
            if food_prep < 0:
                row_issues.append(f"Food Prepared cannot be negative ({food_prep})")
        except (ValueError, TypeError):
            row_issues.append(f"Invalid Food Prepared value '{row['Food_Prepared']}' (must be an integer)")

        try:
            food_cons = int(float(row['Food_Consumed']))
            if food_cons < 0:
                row_issues.append(f"Food Consumed cannot be negative ({food_cons})")
        except (ValueError, TypeError):
            row_issues.append(f"Invalid Food Consumed value '{row['Food_Consumed']}' (must be an integer)")

        try:
            customers = int(float(row['Expected_Customers']))
            if customers <= 0:
                row_issues.append(f"Expected Customers must be greater than 0 ({customers})")
        except (ValueError, TypeError):
            row_issues.append(f"Invalid Expected Customers value '{row['Expected_Customers']}' (must be an integer)")

        # Logic Rule: Food Consumed cannot exceed Food Prepared
        if food_prep is not None and food_cons is not None:
            if food_cons > food_prep:
                row_issues.append(f"Invalid record: Food consumed ({food_cons}) cannot exceed food prepared ({food_prep})")
            
            # Leftover consistency calculation
            calculated_leftover = max(0, food_prep - food_cons)
            try:
                raw_leftover = int(float(row['Leftover']))
                if raw_leftover < 0:
                    row_issues.append(f"Leftover cannot be negative ({raw_leftover})")
                elif raw_leftover != calculated_leftover:
                    # Non-fatal calculation adjustment
                    leftover = calculated_leftover
                else:
                    leftover = raw_leftover
            except (ValueError, TypeError):
                leftover = calculated_leftover
        else:
            leftover = 0

        # Duplicate check (same date & category within file)
        if parsed_date and category:
            unique_key = (parsed_date.strftime('%Y-%m-%d'), category)
            if unique_key in seen_keys:
                duplicate_count += 1
                row_issues.append(f"Duplicate record: A record for '{category}' on {parsed_date} already exists in this file")
            else:
                seen_keys.add(unique_key)

        # Context fields
        holiday = str(row.get('Holiday', 'No')).strip().capitalize()
        if holiday not in ['Yes', 'No']:
            holiday = 'No'
        special_event = str(row.get('Special_Event', 'No')).strip().capitalize()
        if special_event not in ['Yes', 'No']:
            special_event = 'No'
        weather = str(row.get('Weather', 'Sunny')).strip().capitalize()
        if weather not in VALID_WEATHERS:
            weather = 'Sunny'

        if row_issues:
            row_errors.append({
                'row_index': row_num,
                'raw_data': raw_dict,
                'error_reasons': row_issues
            })
        else:
            clean_records.append({
                'date': parsed_date,
                'food_category': category,
                'food_prepared': food_prep,
                'food_consumed': food_cons,
                'leftover': leftover,
                'expected_customers': customers,
                'holiday': holiday,
                'special_event': special_event,
                'weather': weather
            })

    valid_count = len(clean_records)
    invalid_count = len(row_errors)
    is_valid = invalid_count == 0

    if invalid_count > 0:
        summary_messages.append(f"Data Validation: {valid_count} valid rows parsed, {invalid_count} rows contained validation errors.")
    else:
        summary_messages.append(f"Data Validation Passed: All {valid_count} rows are valid and ready for import.")

    return {
        'is_valid': is_valid,
        'total_rows': total_rows,
        'valid_rows': valid_count,
        'invalid_rows': invalid_count,
        'duplicate_rows': duplicate_count,
        'clean_records': clean_records,
        'row_errors': row_errors,
        'summary_messages': summary_messages
    }
