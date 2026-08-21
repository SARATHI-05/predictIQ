-- PredictIQ MySQL Database Schema

CREATE DATABASE IF NOT EXISTS predictiq_db;
USE predictiq_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Staff') NOT NULL DEFAULT 'Staff',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
);

-- 2. Food Records Table
CREATE TABLE IF NOT EXISTS food_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    food_category VARCHAR(50) NOT NULL,
    food_prepared INT NOT NULL,
    food_consumed INT NOT NULL,
    leftover INT NOT NULL,
    expected_customers INT NOT NULL,
    holiday VARCHAR(10) NOT NULL DEFAULT 'No',
    special_event VARCHAR(10) NOT NULL DEFAULT 'No',
    weather VARCHAR(30) NOT NULL DEFAULT 'Sunny',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_category (food_category),
    INDEX idx_weather (weather)
);

-- 3. Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_date DATE NOT NULL,
    food_category VARCHAR(50) NOT NULL,
    expected_customers INT NOT NULL,
    predicted_demand INT NOT NULL,
    recommended_preparation INT NOT NULL,
    demand_level VARCHAR(20) NOT NULL,
    model_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pred_date (prediction_date),
    INDEX idx_pred_category (food_category)
);

-- 4. Resources / Recipe Configuration Table
CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    food_category VARCHAR(50) NOT NULL,
    ingredient_name VARCHAR(100) NOT NULL,
    quantity_per_unit DECIMAL(10, 3) NOT NULL, -- e.g. 0.050 kg per meal
    unit VARCHAR(20) NOT NULL, -- kg, liters, grams, units
    cost_per_unit DECIMAL(10, 2) NOT NULL, -- cost per kg/liter in INR / USD
    current_inventory DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_res_category (food_category),
    INDEX idx_res_ingredient (ingredient_name)
);

-- 5. Resource Plans Table
CREATE TABLE IF NOT EXISTS resource_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_id INT,
    ingredient_name VARCHAR(100) NOT NULL,
    required_quantity DECIMAL(10, 2) NOT NULL,
    available_quantity DECIMAL(10, 2) NOT NULL,
    additional_quantity DECIMAL(10, 2) NOT NULL,
    estimated_cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE SET NULL
);

-- 6. Model Metrics Table
CREATE TABLE IF NOT EXISTS model_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    mae DECIMAL(10, 2) NOT NULL,
    rmse DECIMAL(10, 2) NOT NULL,
    r2_score DECIMAL(10, 4) NOT NULL,
    training_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dataset_size INT NOT NULL,
    model_version VARCHAR(20) NOT NULL DEFAULT '1.0.0'
);

-- 7. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- Surplus, Shortage, Storage, System
    message TEXT NOT NULL,
    severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_read (is_read),
    INDEX idx_alert_type (alert_type)
);

-- 8. Dataset Logs Table
CREATE TABLE IF NOT EXISTS dataset_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    rows_count INT NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL DEFAULT 'Admin',
    status VARCHAR(50) NOT NULL DEFAULT 'Success',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Logs Table (Feature 3)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    user_email VARCHAR(150) NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_module (module),
    INDEX idx_audit_timestamp (timestamp)
);

-- 10. Inventory Tracking Table (Feature 13)
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    min_stock_level DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    max_stock_level DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    supplier VARCHAR(100) DEFAULT 'Primary Wholesale Partner',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_inv_name (ingredient_name),
    INDEX idx_inv_category (category)
);

-- 11. Inventory Transactions Table (Feature 13)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inventory_id INT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- IN, OUT, ADJUSTMENT
    quantity DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) DEFAULT 'Manual Update',
    performed_by VARCHAR(100) NOT NULL DEFAULT 'System',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- 12. Notification Center Table (Feature 2)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    type VARCHAR(50) NOT NULL, -- HIGH_DEMAND, LOW_DEMAND, HIGH_WASTAGE, SURPLUS, SHORTAGE, UPLOAD, ML_TRAINING, REPORT
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_read (is_read),
    INDEX idx_notif_type (type),
    INDEX idx_notif_created (created_at)
);

-- 13. Prediction Accuracy Table (Feature 9)
CREATE TABLE IF NOT EXISTS prediction_accuracy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_id INT NULL,
    food_record_id INT NULL,
    prediction_date DATE NOT NULL,
    food_category VARCHAR(50) NOT NULL,
    predicted_demand INT NOT NULL,
    actual_consumed INT NOT NULL,
    error DECIMAL(10, 2) NOT NULL,
    abs_error DECIMAL(10, 2) NOT NULL,
    percentage_error DECIMAL(10, 2) NOT NULL,
    accuracy_score DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE,
    FOREIGN KEY (food_record_id) REFERENCES food_records(id) ON DELETE SET NULL,
    INDEX idx_acc_date (prediction_date),
    INDEX idx_acc_category (food_category)
);
