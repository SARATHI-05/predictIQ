# PredictIQ Setup & Installation Guide

## Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher (with npm)
- **Database** *(Optional)*: MySQL Server (SQLite driver is included out-of-the-box for instant zero-config startup)

---

## 1. Quick Start (Zero Config)

### Backend Setup
```bash
# 1. Install Python backend dependencies
pip install -r backend/requirements.txt

# 2. Start FastAPI server (runs on port 8000)
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup
```bash
# 1. Install npm dependencies
npm install

# 2. Launch Vite development server (runs on port 5173)
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 2. Default Demo Credentials
| Role | Email | Password | Access Level |
|:---|:---|:---|:---|
| **Admin** | `admin@predictiq.com` | `admin123` | Full Access (Retraining, Uploads, Recipes) |
| **Staff** | `staff@predictiq.com` | `staff123` | Kitchen Operations & Predictions |

*You can also click the "Admin Demo" or "Staff Demo" buttons on the Login page for 1-click access.*

---

## 3. MySQL Database Setup (Optional)
If you prefer running a dedicated MySQL instance:
1. Create database: `CREATE DATABASE predictiq_db;`
2. Set environment variable in `.env`:
   ```env
   DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/predictiq_db
   SECRET_KEY=your-custom-production-secret-key
   ```
3. Restart backend server. Tables and seed data will be created automatically.

---

## 4. Docker Deployment
```bash
docker-compose up --build
```
This starts:
- MySQL Server on port 3306
- FastAPI Backend on port 8000
- React Frontend on port 80/5173
