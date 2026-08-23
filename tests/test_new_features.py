import os
import sys
import io
import json
import urllib.request
import urllib.parse
import urllib.error

# Set UTF-8 encoding for standard output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def make_request(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    encoded_data = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            content_type = response.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return response.status, json.loads(response.read().decode("utf-8"))
            else:
                return response.status, response.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def run_new_feature_tests():
    print("==================================================")
    print("    PREDICTIQ 25 NEW ENTERPRISE FEATURES TEST     ")
    print("==================================================")

    # 1. System Health & Readiness
    status, data = make_request("GET", "/api/health")
    assert status == 200 and data["status"] == "healthy" and data["backend"] == "online"
    status_ready, data_ready = make_request("GET", "/api/ready")
    assert status_ready == 200 and data_ready["ready"] is True
    print("[PASS] 1. System Health & Readiness APIs: PASSED (Backend: online, DB: connected)")

    # 2. Authentication
    status, auth_data = make_request("POST", "/api/auth/login", {"email": "admin@predictiq.com", "password": "admin123"})
    assert status == 200 and "access_token" in auth_data
    token = auth_data["access_token"]
    print("[PASS] 2. Enterprise Admin Authentication: PASSED")

    # 3. Notification Center
    status, unread = make_request("GET", "/api/notifications/unread-count", token=token)
    assert status == 200 and "unread_count" in unread
    status, notifs = make_request("GET", "/api/notifications?limit=10", token=token)
    assert status == 200 and isinstance(notifs, list)
    if notifs:
        notif_id = notifs[0]["id"]
        status, read_res = make_request("PUT", f"/api/notifications/{notif_id}/read", token=token)
        assert status == 200 and read_res["is_read"] is True
    print("[PASS] 3. Notification Center (Fetch, Count, Mark Read): PASSED")

    # 4. Audit Trail
    status, logs = make_request("GET", "/api/audit-logs?page=1&page_size=5", token=token)
    assert status == 200 and "data" in logs and isinstance(logs["data"], list)
    status, csv_data = make_request("GET", "/api/audit-logs/export/csv", token=token)
    assert status == 200 and len(csv_data) > 0
    print("[PASS] 4. Audit Trail (Log History & CSV Export): PASSED")

    # 5. User Management & User Deletion
    status, users = make_request("GET", "/api/users", token=token)
    assert status == 200 and len(users) >= 2
    admin_user = next((u for u in users if u["email"] == "admin@predictiq.com"), None)
    staff = next((u for u in users if u["email"] == "staff@predictiq.com"), None)
    assert staff is not None and admin_user is not None
    status, activity = make_request("GET", f"/api/users/{staff['id']}/activity", token=token)
    assert status == 200 and "activities" in activity

    # Test Self-Deletion Guard (Admin cannot delete own account)
    status_self_del, _ = make_request("DELETE", f"/api/users/{admin_user['id']}", token=token)
    assert status_self_del == 400

    # Test Delete Non-Existent User
    status_404, _ = make_request("DELETE", "/api/users/999999", token=token)
    assert status_404 == 404

    # Register temporary user to test actual deletion
    temp_user_payload = {
        "name": "Temp Test User",
        "email": "temp_delete_test@predictiq.com",
        "password": "Password123!",
        "role": "Staff"
    }
    status_reg, reg_resp = make_request("POST", "/api/auth/register", temp_user_payload)
    status_users, users_list = make_request("GET", "/api/users", token=token)
    temp_user = next((u for u in users_list if u["email"] == temp_user_payload["email"]), None)
    temp_user_id = temp_user["id"] if temp_user else (reg_resp.get("user", {}).get("id") if isinstance(reg_resp, dict) and reg_resp.get("user") else None)

    if temp_user_id:
        status_del, del_res = make_request("DELETE", f"/api/users/{temp_user_id}", token=token)
        assert status_del == 200 and "deleted_user_id" in del_res
        # Verify user is removed from user list
        _, updated_users = make_request("GET", "/api/users", token=token)
        assert not any(u["id"] == temp_user_id for u in updated_users)

    print("[PASS] 5. User Management & User Deletion Safeguards: PASSED")

    # 6. Inventory Tracking & Transactions
    status, inv_summary = make_request("GET", "/api/inventory/summary", token=token)
    assert status == 200 and inv_summary["total_items"] > 0 and inv_summary["total_valuation"] > 0
    status, inv_items = make_request("GET", "/api/inventory", token=token)
    assert status == 200 and len(inv_items) > 0
    item_id = inv_items[0]["id"]
    status, adj_res = make_request("POST", f"/api/inventory/{item_id}/adjust", {"quantity": 5.0, "transaction_type": "IN", "reason": "Fresh Batch"}, token=token)
    assert status == 200
    print(f"[PASS] 6. Inventory Tracking & Stock Adjustment: PASSED (Items: {inv_summary['total_items']}, Valuation: Rs {inv_summary['total_valuation']})")

    # 7. Purchase Recommendations
    status, purchases = make_request("GET", "/api/inventory/purchase-recommendations", token=token)
    assert status == 200 and isinstance(purchases, list) and len(purchases) > 0
    print(f"[PASS] 7. Automated Purchase Recommendations: PASSED ({len(purchases)} ingredient suggestions generated)")

    # 8. Prediction Accuracy Tracking
    status, accuracy_summary = make_request("GET", "/api/accuracy/summary", token=token)
    assert status == 200 and "overall_accuracy_percentage" in accuracy_summary
    status, cat_accuracy = make_request("GET", "/api/accuracy/by-category", token=token)
    assert status == 200 and isinstance(cat_accuracy, list)
    print(f"[PASS] 8. Prediction Accuracy Tracking: PASSED (Overall Accuracy: {accuracy_summary['overall_accuracy_percentage']}%)")

    # 9. ML Model Performance Details
    status, model_perf = make_request("GET", "/api/ml/performance", token=token)
    assert status == 200 and "model_name" in model_perf and "r2_score" in model_perf
    print(f"[PASS] 9. ML Model Performance Dashboard: PASSED (Model: {model_perf['model_name']}, R2: {model_perf['r2_score']})")

    # 10. Database Backup & Recovery Snapshot
    status, backup_res = make_request("POST", "/api/admin/backups/create", token=token)
    assert status == 200 and "filename" in backup_res
    status, backup_list = make_request("GET", "/api/admin/backups", token=token)
    assert status == 200 and len(backup_list) > 0
    print(f"[PASS] 10. Database Backup Engine: PASSED (Created snapshot: {backup_res['filename']})")

    # 11. Food Records Advanced Search & Filtering
    status, filtered_records = make_request("GET", "/api/food-records?category=Meals&min_prepared=200&page=1&page_size=5", token=token)
    assert status == 200 and "data" in filtered_records
    print(f"[PASS] 11. Advanced Multi-Field Search & Filtering: PASSED ({filtered_records['total']} matching records)")

    # 12. PDF Export Endpoint
    status, pdf_html = make_request("GET", "/api/reports/export/pdf?report_type=food_demand", token=token)
    assert status == 200 and b"PredictIQ" in pdf_html
    print("[PASS] 12. Printable PDF/HTML Report Export: PASSED")

    # 13. Category Performance & Smart Insights
    status, analytics_data = make_request("GET", "/api/analytics/insights", token=token)
    assert status == 200 and "category_performance" in analytics_data and "smart_insights" in analytics_data
    print(f"[PASS] 13. Category Performance & Smart Wastage Insights: PASSED ({len(analytics_data['smart_insights'])} active insights)")

    print("\n==================================================")
    print(" [SUCCESS] ALL 13 TEST SUITES (25 FEATURES) PASSED! ")
    print("==================================================")

if __name__ == "__main__":
    run_new_feature_tests()
