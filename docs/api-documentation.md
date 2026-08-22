# PredictIQ REST API Specification

Base URL: `http://127.0.0.1:8000/api`

Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

---

## 1. Authentication & OTP Verification Endpoints
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `POST` | `/auth/register` | Initiate registration, generate 6-digit OTP, dispatch verification email | Public |
| `POST` | `/auth/register/verify` | Verify 6-digit signup OTP, activate user, dispatch Welcome Email, issue JWT | Public |
| `POST` | `/auth/register/resend-code` | Resend signup verification OTP (60s cooldown rate limit) | Public |
| `POST` | `/auth/login` | Unified login (Email/Password or Firebase ID Token) | Public |
| `POST` | `/auth/google` | Alias for Google/Firebase authentication | Public |
| `POST` | `/auth/google/verify` | Verify 6-digit OTP for initial Google signup onboarding | Public |
| `POST` | `/auth/google/resend-code` | Resend Google signup verification OTP (60s cooldown) | Public |
| `POST` | `/auth/forgot-password` | Generate 6-digit password reset OTP, dispatch email | Public |
| `POST` | `/auth/verify-code` | Verify 6-digit password reset OTP | Public |
| `POST` | `/auth/reset-password` | Set new password with bcrypt hash, invalidate reset OTP | Public |
| `GET` | `/auth/me` | Fetch authenticated user profile | Authenticated |
| `GET` | `/auth/users` | List all system users | Admin |

---

## 2. Dashboard Endpoints
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `GET` | `/dashboard/summary` | Today's KPI metric cards (demand, consumption, waste %) | Authenticated |
| `GET` | `/dashboard/trends` | 14-day demand curves & category breakdowns | Authenticated |
| `GET` | `/dashboard/recent-activities` | Latest predictions, logs, and surplus alerts | Authenticated |

---

## 3. Food Records CRUD
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `GET` | `/food-records` | Filtered & paginated historical food logs | Authenticated |
| `POST` | `/food-records` | Add single meal preparation record | Staff/Admin |
| `GET` | `/food-records/{id}` | Retrieve specific food log | Authenticated |
| `PUT` | `/food-records/{id}` | Update existing record | Staff/Admin |
| `DELETE` | `/food-records/{id}` | Remove food record | Staff/Admin |

---

## 4. Dataset Ingestion
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `POST` | `/dataset/upload` | Upload & validate CSV or Excel dataset | Admin |
| `GET` | `/dataset/statistics` | Summary counts, date range, null checks | Authenticated |
| `GET` | `/dataset/logs` | Upload history audit log | Authenticated |

---

## 5. Machine Learning Operations
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `POST` | `/ml/train` | Trigger retraining of Random Forest on database records | Admin |
| `GET` | `/ml/metrics` | Retrieve latest MAE, RMSE, and $R^2$ scores | Authenticated |
| `GET` | `/ml/evaluate` | Multi-algorithm benchmark comparison | Authenticated |

---

## 6. Demand Predictions
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `POST` | `/predictions` | Run ML demand prediction & dynamic ingredient breakdown | Authenticated |
| `GET` | `/predictions` | List historical prediction records | Authenticated |
| `GET` | `/predictions/{id}` | Retrieve prediction details and ingredient plan | Authenticated |

---

## 7. Resources & Planning
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `GET` | `/resources` | List configurable ingredient recipes | Authenticated |
| `POST` | `/resources` | Add new ingredient recipe item | Admin |
| `PUT` | `/resources/{id}` | Update ingredient ratio or unit cost | Admin |
| `DELETE` | `/resources/{id}` | Delete ingredient item | Admin |
| `POST` | `/resources/calculate-plan` | Compute required raw materials & procurement cost | Authenticated |

---

## 8. Analytics & Reports
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `GET` | `/wastage` | Complete food waste calculations and daily trend | Authenticated |
| `GET` | `/analytics` | Deep ML insights (peak day, weather correlation) | Authenticated |
| `GET` | `/reports` | JSON preview of filtered reports | Authenticated |
| `GET` | `/reports/export/csv` | Download filtered report as CSV file | Authenticated |
| `GET` | `/reports/export/excel` | Download styled Excel spreadsheet (.xlsx) | Authenticated |

---

## 9. Alerts
| Method | Endpoint | Description | Access |
|:---|:---|:---|:---|
| `GET` | `/alerts` | Retrieve active surplus and shortage alerts | Authenticated |
| `POST` | `/alerts` | Create new system alert | Authenticated |
| `PUT` | `/alerts/{id}/read` | Mark alert as acknowledged/resolved | Authenticated |
| `DELETE` | `/alerts/{id}` | Dismiss and delete alert | Authenticated |
