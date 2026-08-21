# PredictIQ Database Backup & Disaster Recovery Guide

## Overview

PredictIQ implements automated and manual database snapshotting to protect food consumption history, prediction logs, user activity, and inventory records.

---

## 1. Storage Location & Format

- **Directory**: `backend/database/backups/` or `database/backups/`
- **Naming Pattern**: `predictiq_backup_YYYYMMDD_HHMMSS.db` (for SQLite) or `.sql` (for MySQL).
- **Metadata**: Each snapshot contains full table schemas, constraints, indexes, and seeded state.

---

## 2. Triggering Backups

### Via API Endpoint (Admin Role Required)
```http
POST /api/admin/backups/create
Authorization: Bearer <ADMIN_JWT_TOKEN>
```
Response:
```json
{
  "message": "Database backup created successfully",
  "filename": "predictiq_backup_20260819_114000.db",
  "size_kb": 124.5,
  "created_at": "2026-08-19T11:40:00"
}
```

### Listing Backups
```http
GET /api/admin/backups
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

### Via UI
Navigate to **Settings & Config** (`/settings`) &rarr; scroll to **Database Backup & Disaster Recovery** &rarr; click **Create Backup Snapshot**.

---

## 3. Disaster Recovery & Restoration Procedure

### SQLite (Development / Local Environment)
1. Stop the FastAPI server process:
   ```bash
   # Kill running uvicorn process
   ```
2. Replace active database file with chosen backup snapshot:
   ```bash
   cp backend/database/backups/predictiq_backup_20260819_114000.db backend/predictiq.db
   ```
3. Restart FastAPI server:
   ```bash
   python -m uvicorn app.main:app --port 8000 --app-dir backend
   ```

### MySQL (Docker / Enterprise Staging & Production)
1. In MySQL container:
   ```bash
   # Export backup
   mysqldump -u predictiq -ppredictiq123 predictiq_db > database/backups/predictiq_backup_$(date +%Y%m%d_%H%M%S).sql

   # Restore backup
   mysql -u predictiq -ppredictiq123 predictiq_db < database/backups/predictiq_backup_20260819_114000.sql
   ```

---

## 4. Verification

Run automated E2E tests to verify schema consistency:
```bash
python tests/test_e2e_integration.py
python tests/test_new_features.py
```
