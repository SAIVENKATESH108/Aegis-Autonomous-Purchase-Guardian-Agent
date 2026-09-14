import httpx

def main():
    client = httpx.Client(base_url="http://localhost:8000", timeout=10.0)
    
    # 1. Health
    h = client.get("/health").json()
    print("1. Health Check:", h)

    # 2. Reset and Seed Demo
    client.post("/demo/reset")
    s = client.post("/demo/seed").json()
    print(f"2. Seeded {len(s.get('items', []))} purchases.")

    # 3. List Items (Min-Heap Priority)
    items = client.get("/items").json()
    print("3. Items in Min-Heap priority order:")
    for it in items:
        print(f"   - [{it['merchant']}] {it['name']}: Return in {it['days_left_return']}d | Status: {it['status']} | Recall: {it['has_active_recall']}")

    # 4. List Pending Alerts
    alerts = client.get("/alerts").json()
    print(f"4. Found {len(alerts)} pending actionable escalations:")
    for a in alerts:
        print(f"   - Alert #{a['id'][:8]}: {a['type']} on '{a['item_name']}' ({a['severity']})")
        print(f"     Draft Preview: {a['draft_action'][:80]}...")

    # 5. 1-Click Approve First Alert
    if alerts:
        first_alert = alerts[0]
        approved = client.post(f"/alerts/{first_alert['id']}/approve").json()
        print(f"5. 1-Click Approved Alert #{first_alert['id'][:8]}: status is now '{approved['status']}'")

    # 6. Check Stats
    stats = client.get("/stats").json()
    print("6. Guardian Telemetry Stats:", stats)

if __name__ == "__main__":
    main()
