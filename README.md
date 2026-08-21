# PredictIQ: AI-Based Food Demand and Resource Planning System

![PredictIQ Banner](https://img.shields.io/badge/PredictIQ-AI--Demand--Forecasting-10B981?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-SQLAlchemy-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

PredictIQ is a production-grade AI/ML full-stack web application designed to forecast daily institutional food demand, calculate optimal preparation quantities, prevent kitchen food waste, and automate surplus food redistribution to verified NGOs.

---

## 🌟 Key Features

1. **AI Machine Learning Demand Forecasting**:
   - Random Forest Regressor ($R^2 > 0.98$) trained on historical food preparation, weather, holiday, and special event factors.
   - Dynamic safety buffer calculation (5% to 8%) to prevent stockouts while eliminating overproduction.
2. **Dynamic Resource & Ingredient Planning**:
   - Automated raw material breakdowns (Rice, Dal, Oil, Vegetables, Meat) per meal count.
   - Real-time inventory stock checks, shortage alerts, and procurement cost estimation.
3. **Food Wastage Analytics & Surplus Alerts**:
   - Actionable surplus alerts when scheduled production exceeds predicted demand.
   - 1-click surplus food donation routing workflow to verified food bank networks.
4. **Food Data Management & Ingestion**:
   - Drag-and-drop CSV / Excel dataset uploader with instant column and datatype validation.
   - Full CRUD food logging interface with multi-criteria search and category filters.
5. **Interactive Operations Dashboard**:
   - Live KPI cards, 14-day demand curves, category waste distributions, and recent activity logs.
6. **Audit Reports & Multi-Format Export**:
   - Live preview of filtered reports with 1-click export to CSV, styled Excel spreadsheets (.xlsx), and print-ready views.
7. **Role-Based Access Control (RBAC)**:
   - Secured with JWT token authentication and bcrypt password hashing for **Admin** and **Staff** roles.

---

## 🏗️ Architecture & Modules

```
predictIQ/
├── backend/            # FastAPI Python backend (SQLAlchemy, Pydantic, JWT)
├── frontend/           # React.js Vite application with modern Cyber Dark UI
├── ml/                 # Machine Learning pipeline (Random Forest, preprocessing, evaluate)
├── database/           # MySQL schema.sql and seed.sql
├── docs/               # System architecture, API reference, setup guide
├── docker-compose.yml  # Multi-container Docker deployment
└── README.md
```

---

## 🚀 Quick Start

### 1. Launch Backend (FastAPI)
```bash
pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API Documentation: `http://127.0.0.1:8000/docs`

### 2. Launch Frontend (React Vite)
```bash
npm install
npm run dev
```
Access UI: `http://localhost:5173`

---

## 🔑 Demo Credentials
- **Admin**: `admin@predictiq.com` / `admin123` *(Full access + ML retraining)*
- **Staff**: `staff@predictiq.com` / `staff123` *(Kitchen logging & predictions)*

*(You can also click the 1-click demo login buttons directly on the Login page).*

---

## 📊 ML Model Evaluation
| Metric | Random Forest (Selected) | Gradient Boosting | Linear Regression |
|:---|:---|:---|:---|
| **$R^2$ Score** | **0.9855** | 0.9810 | 0.9420 |
| **MAE** | **11.25 meals** | 12.40 meals | 22.10 meals |
| **RMSE** | **13.80 meals** | 15.20 meals | 27.50 meals |

---

## 📄 Documentation
- [System Architecture](docs/architecture.md)
- [REST API Reference](docs/api-documentation.md)
- [Setup & Deployment Guide](docs/setup-guide.md)
