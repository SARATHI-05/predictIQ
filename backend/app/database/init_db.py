import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

import pandas as pd
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.food_record import FoodRecord
from app.models.resource import Resource
from app.models.model_metric import ModelMetric
from app.models.alert import Alert
from app.models.dataset_log import DatasetLog
from app.models.inventory import InventoryItem, InventoryTransaction
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.verification_code import VerificationCode
from app.utils.auth import get_password_hash

# ML imports
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if root_dir not in sys.path:
    sys.path.append(root_dir)
ml_dir = os.path.join(root_dir, "ml")

from ml.train import train_model

def init_db():

    print("Creating database tables if not present...")
    Base.metadata.create_all(bind=engine)

    # Safe column migration for existing user table
    with engine.connect() as conn:
        for col_def in [
            "is_active BOOLEAN DEFAULT 1",
            "last_login DATETIME",
            "firebase_uid VARCHAR(255)",
            "google_id VARCHAR(100)",
            "avatar_url VARCHAR(500)",
            "reset_token VARCHAR(255)",
            "reset_token_expiry DATETIME"
        ]:

            col_name = col_def.split()[0]
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_def}"))
                conn.commit()
            except Exception:
                pass # column already exists or dialect specific


    db: Session = SessionLocal()

    try:
        # 1. Seed Users
        admin_user = db.query(User).filter(User.email == "admin@predictiq.com").first()
        if not admin_user:
            admin = User(
                name="System Administrator",
                email="admin@predictiq.com",
                password_hash=get_password_hash("admin123"),
                role="Admin",
                is_active=True
            )
            db.add(admin)
            print("Seeded default Admin: admin@predictiq.com / admin123")

        staff_user = db.query(User).filter(User.email == "staff@predictiq.com").first()
        if not staff_user:
            staff = User(
                name="Kitchen Staff",
                email="staff@predictiq.com",
                password_hash=get_password_hash("staff123"),
                role="Staff",
                is_active=True
            )
            db.add(staff)
            print("Seeded default Staff: staff@predictiq.com / staff123")

        # 2. Seed Resources / Recipes
        if db.query(Resource).count() == 0:
            default_resources = [
                Resource(food_category='Meals', ingredient_name='Basmati Rice', quantity_per_unit=0.080, unit='kg', cost_per_unit=60.0, current_inventory=150.0),
                Resource(food_category='Meals', ingredient_name='Mixed Vegetables', quantity_per_unit=0.060, unit='kg', cost_per_unit=45.0, current_inventory=100.0),
                Resource(food_category='Meals', ingredient_name='Toor Dal', quantity_per_unit=0.030, unit='kg', cost_per_unit=120.0, current_inventory=80.0),
                Resource(food_category='Meals', ingredient_name='Cooking Oil', quantity_per_unit=0.015, unit='liters', cost_per_unit=140.0, current_inventory=50.0),
                Resource(food_category='Meals', ingredient_name='Spices & Condiments', quantity_per_unit=0.010, unit='kg', cost_per_unit=250.0, current_inventory=25.0),

                Resource(food_category='Biryani', ingredient_name='Aromatic Long Rice', quantity_per_unit=0.100, unit='kg', cost_per_unit=85.0, current_inventory=200.0),
                Resource(food_category='Biryani', ingredient_name='Chicken / Veg Paneer', quantity_per_unit=0.120, unit='kg', cost_per_unit=220.0, current_inventory=120.0),
                Resource(food_category='Biryani', ingredient_name='Ghee & Refined Oil', quantity_per_unit=0.025, unit='liters', cost_per_unit=450.0, current_inventory=60.0),
                Resource(food_category='Biryani', ingredient_name='Biryani Spices & Saffron', quantity_per_unit=0.015, unit='kg', cost_per_unit=500.0, current_inventory=20.0),
                Resource(food_category='Biryani', ingredient_name='Onions & Curd', quantity_per_unit=0.060, unit='kg', cost_per_unit=35.0, current_inventory=80.0),

                Resource(food_category='Breakfast', ingredient_name='Idli/Dosa Batter & Flours', quantity_per_unit=0.090, unit='kg', cost_per_unit=40.0, current_inventory=90.0),
                Resource(food_category='Breakfast', ingredient_name='Chana/Sambhar Dal', quantity_per_unit=0.025, unit='kg', cost_per_unit=110.0, current_inventory=60.0),
                Resource(food_category='Breakfast', ingredient_name='Coconut & Chutney Base', quantity_per_unit=0.030, unit='kg', cost_per_unit=70.0, current_inventory=40.0),
                Resource(food_category='Breakfast', ingredient_name='Cooking Oil', quantity_per_unit=0.010, unit='liters', cost_per_unit=140.0, current_inventory=35.0),

                Resource(food_category='Snacks', ingredient_name='Flour / Potato Samosa Base', quantity_per_unit=0.075, unit='kg', cost_per_unit=35.0, current_inventory=75.0),
                Resource(food_category='Snacks', ingredient_name='Frying Oil', quantity_per_unit=0.020, unit='liters', cost_per_unit=140.0, current_inventory=65.0),
                Resource(food_category='Snacks', ingredient_name='Tea / Coffee / Beverage Mix', quantity_per_unit=0.015, unit='kg', cost_per_unit=300.0, current_inventory=30.0),

                Resource(food_category='Dinner', ingredient_name='Wheat Flour (Chapati/Roti)', quantity_per_unit=0.080, unit='kg', cost_per_unit=45.0, current_inventory=110.0),
                Resource(food_category='Dinner', ingredient_name='Paneer / Curry Protein', quantity_per_unit=0.070, unit='kg', cost_per_unit=280.0, current_inventory=70.0),
                Resource(food_category='Dinner', ingredient_name='Fresh Gravy Vegetables', quantity_per_unit=0.060, unit='kg', cost_per_unit=40.0, current_inventory=85.0),
                Resource(food_category='Dinner', ingredient_name='Cooking Oil', quantity_per_unit=0.015, unit='liters', cost_per_unit=140.0, current_inventory=45.0),

                Resource(food_category='Desserts', ingredient_name='Milk & Cream', quantity_per_unit=0.080, unit='liters', cost_per_unit=65.0, current_inventory=50.0),
                Resource(food_category='Desserts', ingredient_name='Sugar & Sweeteners', quantity_per_unit=0.035, unit='kg', cost_per_unit=45.0, current_inventory=60.0),
                Resource(food_category='Desserts', ingredient_name='Dry Fruits & Flavors', quantity_per_unit=0.010, unit='kg', cost_per_unit=800.0, current_inventory=15.0)
            ]
            db.add_all(default_resources)
            print("Seeded standard recipe ingredient resources.")

        # 3. Seed Inventory Items (Feature 13)
        if db.query(InventoryItem).count() == 0:
            default_inventory = [
                InventoryItem(ingredient_name='Basmati Rice', category='Grains', unit='kg', current_stock=150.0, min_stock_level=40.0, max_stock_level=500.0, unit_cost=60.0, supplier='Agro Foods Ltd'),
                InventoryItem(ingredient_name='Aromatic Long Rice', category='Grains', unit='kg', current_stock=200.0, min_stock_level=50.0, max_stock_level=600.0, unit_cost=85.0, supplier='Agro Foods Ltd'),
                InventoryItem(ingredient_name='Wheat Flour (Chapati/Roti)', category='Grains', unit='kg', current_stock=110.0, min_stock_level=30.0, max_stock_level=400.0, unit_cost=45.0, supplier='Sunrise Mills'),
                InventoryItem(ingredient_name='Toor Dal', category='Pulses', unit='kg', current_stock=80.0, min_stock_level=25.0, max_stock_level=250.0, unit_cost=120.0, supplier='Pure Pulses Co'),
                InventoryItem(ingredient_name='Chana/Sambhar Dal', category='Pulses', unit='kg', current_stock=60.0, min_stock_level=20.0, max_stock_level=200.0, unit_cost=110.0, supplier='Pure Pulses Co'),
                InventoryItem(ingredient_name='Cooking Oil', category='Oils', unit='liters', current_stock=50.0, min_stock_level=25.0, max_stock_level=300.0, unit_cost=140.0, supplier='Golden Oil Traders'),
                InventoryItem(ingredient_name='Ghee & Refined Oil', category='Oils', unit='liters', current_stock=60.0, min_stock_level=20.0, max_stock_level=200.0, unit_cost=450.0, supplier='Dairy Pure'),
                InventoryItem(ingredient_name='Chicken / Veg Paneer', category='Protein', unit='kg', current_stock=120.0, min_stock_level=40.0, max_stock_level=300.0, unit_cost=220.0, supplier='Fresh Farms'),
                InventoryItem(ingredient_name='Paneer / Curry Protein', category='Protein', unit='kg', current_stock=70.0, min_stock_level=25.0, max_stock_level=200.0, unit_cost=280.0, supplier='Fresh Farms'),
                InventoryItem(ingredient_name='Mixed Vegetables', category='Vegetables', unit='kg', current_stock=100.0, min_stock_level=35.0, max_stock_level=350.0, unit_cost=45.0, supplier='Local Green Mandi'),
                InventoryItem(ingredient_name='Fresh Gravy Vegetables', category='Vegetables', unit='kg', current_stock=85.0, min_stock_level=30.0, max_stock_level=250.0, unit_cost=40.0, supplier='Local Green Mandi'),
                InventoryItem(ingredient_name='Onions & Curd', category='Vegetables', unit='kg', current_stock=80.0, min_stock_level=25.0, max_stock_level=200.0, unit_cost=35.0, supplier='Local Green Mandi'),
                InventoryItem(ingredient_name='Idli/Dosa Batter & Flours', category='Ready Mix', unit='kg', current_stock=90.0, min_stock_level=30.0, max_stock_level=250.0, unit_cost=40.0, supplier='Batter Craft'),
                InventoryItem(ingredient_name='Spices & Condiments', category='Spices', unit='kg', current_stock=25.0, min_stock_level=10.0, max_stock_level=100.0, unit_cost=250.0, supplier='Spice Kingdom'),
                InventoryItem(ingredient_name='Biryani Spices & Saffron', category='Spices', unit='kg', current_stock=20.0, min_stock_level=8.0, max_stock_level=80.0, unit_cost=500.0, supplier='Spice Kingdom'),
                InventoryItem(ingredient_name='Milk & Cream', category='Dairy', unit='liters', current_stock=50.0, min_stock_level=20.0, max_stock_level=150.0, unit_cost=65.0, supplier='Dairy Pure'),
                InventoryItem(ingredient_name='Sugar & Sweeteners', category='Essentials', unit='kg', current_stock=60.0, min_stock_level=15.0, max_stock_level=200.0, unit_cost=45.0, supplier='Sunrise Mills'),
                InventoryItem(ingredient_name='Dry Fruits & Flavors', category='Essentials', unit='kg', current_stock=15.0, min_stock_level=5.0, max_stock_level=50.0, unit_cost=800.0, supplier='Nuts & Spices Emporium')
            ]
            db.add_all(default_inventory)
            print(f"Seeded {len(default_inventory)} inventory stock items.")

        # 4. Seed Food Records from dataset.csv if table is empty
        if db.query(FoodRecord).count() == 0:
            dataset_csv = os.path.join(ml_dir, "dataset.csv")
            if os.path.exists(dataset_csv):
                df = pd.read_csv(dataset_csv)
                records_to_insert = []
                for _, row in df.iterrows():
                    records_to_insert.append(FoodRecord(
                        date=pd.to_datetime(row['Date']).date(),
                        food_category=str(row['Food_Category']),
                        food_prepared=int(row['Food_Prepared']),
                        food_consumed=int(row['Food_Consumed']),
                        leftover=int(row['Leftover']),
                        expected_customers=int(row['Expected_Customers']),
                        holiday=str(row.get('Holiday', 'No')),
                        special_event=str(row.get('Special_Event', 'No')),
                        weather=str(row.get('Weather', 'Sunny'))
                    ))
                db.add_all(records_to_insert)
                db.commit()
                print(f"Seeded {len(records_to_insert)} historical food records into database.")

                # Log dataset seed
                log = DatasetLog(
                    filename="dataset.csv",
                    rows_count=len(records_to_insert),
                    uploaded_by="System Initializer",
                    status="Success"
                )
                db.add(log)

        # 5. Seed Alerts & Notifications (Feature 2)
        if db.query(Alert).count() == 0:
            alerts = [
                Alert(alert_type='Surplus', message='Surplus Alert: Expected 65 extra Biryani meals on upcoming Friday lunch service. Recommended donation routing ready.', severity='High', is_read=False),
                Alert(alert_type='System', message='PredictIQ Random Forest ML Demand Model v1.0.0 successfully loaded and calibrated.', severity='Low', is_read=True),
                Alert(alert_type='Shortage', message='Inventory Watch: Basmati Rice current stock (150kg) approaching minimum reorder threshold for weekend demand.', severity='Medium', is_read=False)
            ]
            db.add_all(alerts)
            print("Seeded initial alerts.")

        if db.query(Notification).count() == 0:
            initial_notifs = [
                Notification(type='SURPLUS', title='Possible Food Surplus Warning', message='Predicted excess of ~45 Biryani meals for Friday dinner service. Consider enabling donation queue.', severity='High', is_read=False),
                Notification(type='ML_TRAINING', title='ML Model Calibrated', message='Random Forest Regressor v1.0.0 retrained with R² score: 0.985.', severity='Low', is_read=True),
                Notification(type='SHORTAGE', title='Resource Stock Alert', message='Toor Dal inventory levels are near the minimum threshold of 25kg.', severity='Medium', is_read=False),
                Notification(type='HIGH_DEMAND', title='Peak Demand Forecast', message='Expected 480+ meals demand for Biryani on upcoming festive weekend.', severity='Medium', is_read=False)
            ]
            db.add_all(initial_notifs)
            print("Seeded initial notification center messages.")

        # 6. Seed System Audit Logs (Feature 3)
        if db.query(AuditLog).count() == 0:
            initial_logs = [
                AuditLog(user_id=1, user_email='admin@predictiq.com', action='SYSTEM_STARTUP', module='System', record_id='1', description='PredictIQ system initialized and core tables verified.', ip_address='127.0.0.1'),
                AuditLog(user_id=1, user_email='admin@predictiq.com', action='DATASET_UPLOAD', module='Dataset', record_id='1', description='Initial baseline historical dataset dataset.csv imported.', ip_address='127.0.0.1'),
                AuditLog(user_id=1, user_email='admin@predictiq.com', action='ML_MODEL_TRAINED', module='MachineLearning', record_id='1', description='Random Forest demand regressor v1.0.0 calibrated and cached.', ip_address='127.0.0.1')
            ]
            db.add_all(initial_logs)
            print("Seeded initial audit logs.")

        # 7. Train & Seed Initial ML Model if needed
        model_path = os.path.join(ml_dir, "model.pkl")
        if not os.path.exists(model_path) or db.query(ModelMetric).count() == 0:
            dataset_csv = os.path.join(ml_dir, "dataset.csv")
            _, metrics = train_model(dataset_path=dataset_csv, model_output_path=model_path)
            metric_entry = ModelMetric(
                model_name=metrics['model_name'],
                mae=metrics['mae'],
                rmse=metrics['rmse'],
                r2_score=metrics['r2_score'],
                dataset_size=metrics['dataset_size'],
                model_version=metrics['model_version']
            )
            db.add(metric_entry)
            print("Trained initial ML model and stored metrics.")

        db.commit()
        print("Database initialization and seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during db initialization: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
