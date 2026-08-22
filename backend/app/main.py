import os
import sys
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import func, text


# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)
parent_dir = os.path.dirname(backend_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from app.database.database import get_db, engine
from app.database.init_db import init_db
from app.api import (
    auth,
    dashboard,
    food_records,
    dataset,
    ml_routes,
    predictions,
    resources,
    wastage,
    analytics,
    reports,
    alerts,
    notifications,
    audit_logs,
    users,
    inventory,
    accuracy,
    backup
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run database initialization and model loading
    print("Starting PredictIQ Backend...")
    try:
        init_db()
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")
    yield
    print("Shutting down PredictIQ Backend...")

app = FastAPI(
    title="PredictIQ API",
    description="AI-Based Food Demand and Resource Planning System Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
allowed_origins_env = os.getenv("CORS_ORIGINS", "")
custom_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

origins = [
    "https://predict-iq-seven.vercel.app",
    "https://q-seven.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4173",
] + custom_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"(https://.*\.vercel\.app|https://.*\.onrender\.com|http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?)",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "Access-Control-Request-Headers", "Access-Control-Request-Method"],
)


# Register API Routers (Standard Routes)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(food_records.router)
app.include_router(dataset.router)
app.include_router(ml_routes.router)
app.include_router(predictions.router)
app.include_router(resources.router)
app.include_router(wastage.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(alerts.router)
app.include_router(notifications.router)
app.include_router(audit_logs.router)
app.include_router(users.router)
app.include_router(inventory.router)
app.include_router(accuracy.router)
app.include_router(backup.router)

# Versioned API Aliases (/api/v1/...) (Feature 18)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(food_records.router, prefix="/api/v1")
app.include_router(dataset.router, prefix="/api/v1")
app.include_router(ml_routes.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(resources.router, prefix="/api/v1")
app.include_router(wastage.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(audit_logs.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(accuracy.router, prefix="/api/v1")
app.include_router(backup.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "system": "PredictIQ",
        "status": "online",
        "description": "AI-Based Food Demand and Resource Planning System",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

@app.get("/health")
def health_simple():
    """
    Standard lightweight health check endpoint returning {"status": "ok"}
    """
    return {"status": "ok"}

@app.get("/api/health")


def health_check(db: Session = Depends(get_db)):
    """
    Feature 17: Comprehensive System Health API
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"


    ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
    model_exists = os.path.exists(os.path.join(ml_dir, "model.pkl")) or os.path.exists(os.path.join(ml_dir, "dataset.csv"))

    return {
        "status": "healthy",
        "backend": "online",
        "database": db_status,
        "ml_model": "available" if model_exists else "unavailable"
    }

@app.get("/api/ready")
def readiness_check():
    """
    Feature 17: Readiness probe endpoint
    """
    return {
        "ready": True,
        "status": "operational"
    }
