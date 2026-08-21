-- PredictIQ Seed Data

USE predictiq_db;

-- 1. Insert Default Users (Password: admin123 and staff123 hashed with bcrypt)
-- Hash for 'admin123': $2b$12$4mUq7HZZW.3Yt3W9PqM.ZOPj2e/Zz1.Y1w9rQ5qQ1w9rQ5qQ1w9rQ (or generated dynamically)
-- Dynamic seed will handle bcrypt hashing in python init_db script as well

-- 2. Insert Standard Food Category Ingredient Recipes
INSERT INTO resources (food_category, ingredient_name, quantity_per_unit, unit, cost_per_unit, current_inventory) VALUES
('Meals', 'Basmati Rice', 0.080, 'kg', 60.00, 150.00),
('Meals', 'Mixed Vegetables', 0.060, 'kg', 45.00, 100.00),
('Meals', 'Toor Dal', 0.030, 'kg', 120.00, 80.00),
('Meals', 'Cooking Oil', 0.015, 'liters', 140.00, 50.00),
('Meals', 'Spices & Condiments', 0.010, 'kg', 250.00, 25.00),

('Biryani', 'Aromatic Long Rice', 0.100, 'kg', 85.00, 200.00),
('Biryani', 'Chicken / Veg Paneer', 0.120, 'kg', 220.00, 120.00),
('Biryani', 'Ghee & Refined Oil', 0.025, 'liters', 450.00, 60.00),
('Biryani', 'Biryani Spices & Saffron', 0.015, 'kg', 500.00, 20.00),
('Biryani', 'Onions & Curd', 0.060, 'kg', 35.00, 80.00),

('Breakfast', 'Idli/Dosa Batter & Flours', 0.090, 'kg', 40.00, 90.00),
('Breakfast', 'Chana/Sambhar Dal', 0.025, 'kg', 110.00, 60.00),
('Breakfast', 'Coconut & Chutney Ingredients', 0.030, 'kg', 70.00, 40.00),
('Breakfast', 'Cooking Oil', 0.010, 'liters', 140.00, 35.00),

('Snacks', 'Flour / Potatoes / Samosa Base', 0.075, 'kg', 35.00, 75.00),
('Snacks', 'Frying Oil', 0.020, 'liters', 140.00, 65.00),
('Snacks', 'Tea / Coffee / Beverage Mix', 0.015, 'kg', 300.00, 30.00),

('Dinner', 'Wheat Flour (Chapati/Roti)', 0.080, 'kg', 45.00, 110.00),
('Dinner', 'Paneer / Curry Protein', 0.070, 'kg', 280.00, 70.00),
('Dinner', 'Fresh Gravy Vegetables', 0.060, 'kg', 40.00, 85.00),
('Dinner', 'Cooking Oil', 0.015, 'liters', 140.00, 45.00),

('Desserts', 'Milk & Cream', 0.080, 'liters', 65.00, 50.00),
('Desserts', 'Sugar & Sweeteners', 0.035, 'kg', 45.00, 60.00),
('Desserts', 'Dry Fruits & Flavors', 0.010, 'kg', 800.00, 15.00);

-- 3. Initial Alerts
INSERT INTO alerts (alert_type, message, severity, is_read) VALUES
('Surplus', 'Surplus Alert: Expected 65 extra Biryani meals on upcoming Friday lunch service. Recommended donation routing ready.', 'High', FALSE),
('System', 'PredictIQ Random Forest ML Demand Model v1.0.0 successfully loaded and calibrated.', 'Low', TRUE),
('Shortage', 'Inventory Watch: Basmati Rice current stock (150kg) approaching minimum reorder threshold for weekend demand.', 'Medium', FALSE);
