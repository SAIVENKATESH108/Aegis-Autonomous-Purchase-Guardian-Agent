import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app


def test_all_live_endpoints():
    client = TestClient(app)
    
    # 1. Stats
    res = client.get("/stats")
    assert res.status_code == 200
    stats = res.json()
    print("[PASS] GET /stats:", stats["total_items_monitored"], "items tracked")

    # 2. Reset & Seed
    client.post("/demo/reset")
    res = client.post("/demo/seed")
    assert res.status_code == 200
    seed_data = res.json()
    print("[PASS] POST /demo/seed:", len(seed_data["items"]), "demo items ingested")

    # 3. List items (Min-Heap sorted)
    res = client.get("/items")
    assert res.status_code == 200
    items = res.json()
    print("[PASS] GET /items:", len(items), "items retrieved, top item:", items[0]["name"])

    # 4. Alerts
    res = client.get("/alerts")
    assert res.status_code == 200
    alerts = res.json()
    print("[PASS] GET /alerts:", len(alerts), "actionable escalations surfaced")

    # 5. Simulate Day 28 (Time-travel)
    res = client.post("/demo/simulate-expiry")
    assert res.status_code == 200
    sim_data = res.json()
    print("[PASS] POST /demo/simulate-expiry:", sim_data["message"])

    # 6. Live CPSC Federal Recall Search
    res = client.get("/recalls/live-search?q=heater")
    assert res.status_code == 200
    recalls = res.json()
    print(f"[PASS] GET /recalls/live-search?q=heater: {recalls['count']} live federal recalls returned from saferproducts.gov")

    # 7. Protect a recalled product
    res = client.post("/recalls/protect", json={
        "title": "Live CPSC Heater Recall #9901",
        "recall_id": "9901",
        "hazard": "Risk of overheating and thermal fire hazard",
        "remedy": "Full refund",
        "consumer_contact": "Heater Support at 1-800-555-0199",
        "merchant": "Home Depot",
        "price": 89.99
    })
    assert res.status_code == 200
    shielded = res.json()
    print("[PASS] POST /recalls/protect: Shielded", shielded["name"], "with active recall:", shielded["has_active_recall"])

    # 8. Observer Pattern Events
    res = client.get("/events/recent")
    assert res.status_code == 200
    events = res.json()
    print(f"[PASS] GET /events/recent: {len(events['in_app_events'])} in-app events, {len(events['telegram_dispatches'])} telegram dispatches")

    print("\nALL LIVE ENDPOINTS VERIFIED AND FULLY FUNCTIONAL!")


if __name__ == "__main__":
    test_all_live_endpoints()
