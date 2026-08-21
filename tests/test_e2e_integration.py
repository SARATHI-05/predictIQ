import json
import urllib.request
import urllib.parse
import sys
import io

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
    with urllib.request.urlopen(req) as response:
        content_type = response.headers.get("Content-Type", "")
        if "application/json" in content_type:
            return response.status, json.loads(response.read().decode("utf-8"))
        else:
            return response.status, response.read()

def run_e2e_tests():
    print("==================================================")
    print("    PREDICTIQ COMPREHENSIVE E2E INTEGRATION TEST   ")
    print("==================================================")

    # 1. Health
    status, data = make_request("GET", "/api/health")
    assert status == 200 and data["status"] == "healthy"
    print("[PASS] 1. Backend Health Check: PASSED")

    # 2. Authentication
    status, admin_auth = make_request("POST", "/api/auth/login", {"email": "admin@predictiq.com", "password": "admin123"})
    assert status == 200 and "access_token" in admin_auth
    admin_token = admin_auth["access_token"]
    print(f"[PASS] 2. Admin JWT Authentication: PASSED (Role: {admin_auth['user']['role']})")

    status, staff_auth = make_request("POST", "/api/auth/login", {"email": "staff@predictiq.com", "password": "staff123"})
    assert status == 200 and staff_auth["user"]["role"] == "Staff"
    print("[PASS] 3. Staff JWT Authentication: PASSED")

    # 3. Dashboard
    status, summary = make_request("GET", "/api/dashboard/summary", token=admin_token)
    assert status == 200 and "today_predicted_demand" in summary
    print(f"[PASS] 4. Dashboard Summary: PASSED (Predicted: {summary['today_predicted_demand']} meals, Consumed: {summary['today_consumption']})")

    status, trends = make_request("GET", "/api/dashboard/trends", token=admin_token)
    assert status == 200 and len(trends["demand_trend"]) > 0
    print(f"[PASS] 5. Dashboard Trends: PASSED ({len(trends['demand_trend'])} data points, {len(trends['category_demand'])} categories)")

    # 4. Food Records CRUD
    status, records = make_request("GET", "/api/food-records?page=1&page_size=5", token=admin_token)
    assert status == 200 and len(records["data"]) == 5
    print(f"[PASS] 6. Food Records Paginated Query: PASSED (Total: {records['total']} logs)")

    new_record_payload = {
        "date": "2026-08-28",
        "food_category": "Biryani",
        "food_prepared": 500,
        "food_consumed": 475,
        "leftover": 25,
        "expected_customers": 480,
        "holiday": "No",
        "special_event": "Yes",
        "weather": "Sunny"
    }
    status, created_rec = make_request("POST", "/api/food-records", new_record_payload, token=admin_token)
    assert status == 201 and created_rec["food_prepared"] == 500
    rec_id = created_rec["id"]
    print(f"[PASS] 7. Food Record CREATE: PASSED (Record #{rec_id})")

    status, updated_rec = make_request("PUT", f"/api/food-records/{rec_id}", {"food_consumed": 480}, token=admin_token)
    assert status == 200 and updated_rec["leftover"] == 20
    print(f"[PASS] 8. Food Record UPDATE & Leftover Recalculation: PASSED (Leftover: {updated_rec['leftover']})")

    status, del_resp = make_request("DELETE", f"/api/food-records/{rec_id}", token=admin_token)
    assert status == 200
    print("[PASS] 9. Food Record DELETE: PASSED")

    # 5. ML Demand Prediction Engine
    pred_payload = {
        "date": "2026-08-30",
        "food_category": "Biryani",
        "expected_customers": 450,
        "holiday": "No",
        "special_event": "Yes",
        "weather": "Sunny",
        "planned_preparation": 540
    }
    status, prediction = make_request("POST", "/api/predictions", pred_payload, token=admin_token)
    assert status == 200 and prediction["predicted_demand"] > 0
    assert prediction["surplus_detected"] is True
    assert len(prediction["ingredients"]) > 0
    print(f"[PASS] 10. ML Demand Prediction: PASSED (Demand: {prediction['predicted_demand']}, Prep: {prediction['recommended_preparation']}, Level: {prediction['demand_level']})")
    print(f"[PASS] 11. Surplus Risk Trigger: PASSED (Surplus: {prediction['surplus_meals']} meals, Severity: {prediction['surplus_severity']})")
    print(f"[PASS] 12. Dynamic Recipe Ingredients: PASSED ({len(prediction['ingredients'])} ingredients calculated, Est Cost: Rs {prediction['total_estimated_ingredient_cost']})")

    # 6. Resource Planning
    calc_payload = {"food_category": "Meals", "target_meals": 600}
    status, plan = make_request("POST", "/api/resources/calculate-plan", calc_payload, token=admin_token)
    assert status == 200 and len(plan["ingredients"]) > 0
    print(f"[PASS] 13. Resource Planning Calculator: PASSED (Total Cost: Rs {plan['total_estimated_cost']})")

    # 7. Wastage & Analytics
    status, wastage = make_request("GET", "/api/wastage", token=admin_token)
    assert status == 200 and "overall_wastage_percentage" in wastage
    print(f"[PASS] 14. Food Wastage Analytics: PASSED (Prepared: {wastage['total_prepared']}, Wastage: {wastage['overall_wastage_percentage']}%)")

    status, analytics = make_request("GET", "/api/analytics", token=admin_token)
    assert status == 200 and analytics["highest_demand_food"] != "N/A"
    print(f"[PASS] 15. AI Analytics Insights: PASSED (Top Category: {analytics['highest_demand_food']}, Peak Day: {analytics['peak_demand_day']})")

    # 8. Reports & Exports
    status, report_data = make_request("GET", "/api/reports?report_type=food_demand", token=admin_token)
    assert status == 200 and len(report_data["items"]) > 0
    print(f"[PASS] 16. Filtered Reports Preview: PASSED ({report_data['total_records']} records)")

    status, csv_data = make_request("GET", "/api/reports/export/csv?report_type=food_demand", token=admin_token)
    assert status == 200 and len(csv_data) > 50
    print(f"[PASS] 17. CSV Report Export: PASSED ({len(csv_data)} bytes generated)")

    status, excel_data = make_request("GET", "/api/reports/export/excel?report_type=food_demand", token=admin_token)
    assert status == 200 and len(excel_data) > 100
    print(f"[PASS] 18. Excel Spreadsheet Export (.xlsx): PASSED ({len(excel_data)} bytes generated)")

    # 9. Alerts
    status, alerts = make_request("GET", "/api/alerts", token=admin_token)
    assert status == 200 and len(alerts) > 0
    first_alert_id = alerts[0]["id"]
    status, read_alert = make_request("PUT", f"/api/alerts/{first_alert_id}/read", token=admin_token)
    assert status == 200 and read_alert["is_read"] is True
    print(f"[PASS] 19. Alert Resolution & Acknowledge: PASSED (Alert #{first_alert_id} resolved)")

    # 10. ML Retraining & Benchmark Evaluation
    status, retrain_result = make_request("POST", "/api/ml/train", token=admin_token)
    assert status == 200 and retrain_result["r2_score"] > 0.85
    print(f"[PASS] 20. Live ML Retraining Engine: PASSED (Model: {retrain_result['model_name']}, R2: {retrain_result['r2_score']}, MAE: {retrain_result['mae']} meals)")

    status, benchmark = make_request("GET", "/api/ml/evaluate", token=admin_token)
    assert status == 200 and len(benchmark["benchmark_results"]) == 3
    print(f"[PASS] 21. Multi-Model Benchmark Comparison: PASSED ({', '.join(b['Model'] for b in benchmark['benchmark_results'])})")

    print("\n==================================================")
    print(" [SUCCESS] ALL 21 END-TO-END INTEGRATION TESTS PASSED! ")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_tests()
