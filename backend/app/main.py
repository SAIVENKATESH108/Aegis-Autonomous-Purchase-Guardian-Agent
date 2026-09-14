"""
FastAPI Main Application for Aegis — Autonomous Purchase Guardian Agent.

Fulfills all hackathon endpoints:
- POST /items: Ingest receipt, extract data via IngestionAgent, persist via ItemRepository, triage via TriageAgent.
- GET /items: List tracked purchases sorted by nearest deadline (backed by MinHeap).
- GET /alerts: List actionable escalations requiring human decision.
- POST /alerts/{id}/approve: 1-click approval for pre-drafted return/claim actions.
- POST /alerts/{id}/dismiss: Dismiss an alert.
- POST /demo/seed: Instant 1-click load of 3 seed receipts (silent vs escalation demonstration).
- GET /stats: Guardian intelligence stats and Amazon Bedrock connectivity status.
"""

from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings, db_singleton, bedrock_singleton, Base
from app.models import Item, Escalation
from app.schemas import (
    ReceiptInput,
    ItemResponse,
    EscalationResponse,
    ActionApprovalRequest,
    SystemStats
)
from app.repository import ItemRepository
from app.agents.ingestion_agent import ingestion_agent
from app.agents.triage_agent import triage_agent
from app.services.seed_data import get_demo_receipts
from app.publisher import in_app_notifier, telegram_notifier, escalation_publisher
from app.data_structures import global_deadline_heap


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables
    Base.metadata.create_all(bind=db_singleton.engine)
    # Sync min-heap on startup
    with db_singleton.sessionmaker() as session:
        repo = ItemRepository(session)
        repo.sync_heap()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Autonomous Purchase Guardian Agent tracking deadlines, warranties, and safety recalls.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_repo():
    """Dependency injection for ItemRepository (Repository Pattern)."""
    db = db_singleton.sessionmaker()
    try:
        yield ItemRepository(db)
    finally:
        db.close()


def item_to_response(item: Item) -> dict:
    """Helper to compute response fields."""
    now = datetime.now(timezone.utc)
    
    ret_deadline = item.return_deadline
    if ret_deadline and ret_deadline.tzinfo is None:
        ret_deadline = ret_deadline.replace(tzinfo=timezone.utc)
    
    days_left_ret = 0
    if ret_deadline:
        diff = (ret_deadline - now).total_seconds() / 86400.0
        days_left_ret = int(round(diff))

    war_deadline = item.warranty_deadline
    if war_deadline and war_deadline.tzinfo is None:
        war_deadline = war_deadline.replace(tzinfo=timezone.utc)
        
    days_left_war = 0
    if war_deadline:
        diff_war = (war_deadline - now).total_seconds() / 86400.0
        days_left_war = int(round(diff_war))

    active_recalls = [e for e in item.escalations if e.type == "recall_match" and e.status == "pending"]

    return {
        "id": item.id,
        "name": item.name,
        "merchant": item.merchant,
        "price": item.price,
        "currency": item.currency,
        "purchase_date": item.purchase_date,
        "category": item.category,
        "model_number": item.model_number,
        "return_window_days": item.return_window_days,
        "return_deadline": item.return_deadline,
        "warranty_days": item.warranty_days,
        "warranty_deadline": item.warranty_deadline,
        "status": item.status,
        "created_at": item.created_at,
        "days_left_return": days_left_ret,
        "days_left_warranty": days_left_war,
        "is_return_closing_soon": 0 <= days_left_ret <= settings.RETURN_WINDOW_WARNING_DAYS,
        "has_active_recall": len(active_recalls) > 0,
        "escalations": [
            {
                "id": e.id,
                "type": e.type,
                "severity": e.severity,
                "status": e.status,
                "reason": e.reason,
                "created_at": e.created_at
            }
            for e in item.escalations
        ]
    }


def escalation_to_response(e: Escalation) -> dict:
    return {
        "id": e.id,
        "item_id": e.item_id,
        "item_name": e.item.name if e.item else None,
        "merchant": e.item.merchant if e.item else None,
        "price": e.item.price if e.item else None,
        "type": e.type,
        "severity": e.severity,
        "reason": e.reason,
        "draft_action": e.draft_action,
        "draft_recipient": e.draft_recipient,
        "status": e.status,
        "cpsc_recall_id": e.cpsc_recall_id,
        "created_at": e.created_at,
        "resolved_at": e.resolved_at
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "bedrock": bedrock_singleton.status_summary,
        "heap_size": len(global_deadline_heap)
    }


@app.get("/stats", response_model=SystemStats)
def get_stats(repo: ItemRepository = Depends(get_repo)):
    """Provides guardian telemetry for dashboard counters."""
    stats = repo.get_stats()
    stats["bedrock_status"] = bedrock_singleton.status_summary
    return stats


@app.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def add_item(receipt: ReceiptInput, repo: ItemRepository = Depends(get_repo)):
    """
    Ingests a new purchase receipt:
    1. IngestionAgent parses and standardizes data.
    2. ItemRepository persists to SQLite and updates the Min-Heap.
    3. TriageAgent runs Strategy rules. If an escalation is warranted,
       DraftAgent creates a 1-click action draft and EscalationPublisher notifies observers.
    """
    # 1. Ingestion
    parsed = ingestion_agent.process_receipt(receipt)
    
    # 2. Persist
    item = repo.create_item(parsed, raw_input=receipt.raw_text)

    # 3. Triage
    triage_agent.evaluate_item(item, repo)

    # Re-fetch item to reflect generated escalations
    refreshed = repo.get_item(item.id)
    return item_to_response(refreshed or item)


@app.get("/items", response_model=List[ItemResponse])
def list_items(status: Optional[str] = None, repo: ItemRepository = Depends(get_repo)):
    """
    Returns tracked items sorted by nearest deadline (MinHeap prioritized).
    """
    items = repo.list_items(status=status)
    return [item_to_response(it) for it in items]


@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: str, repo: ItemRepository = Depends(get_repo)):
    """Returns detailed purchase record and audit history."""
    item = repo.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item_to_response(item)


@app.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: str, repo: ItemRepository = Depends(get_repo)):
    """Deletes an item and removes it from the deadline heap."""
    success = repo.delete_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return None


@app.get("/alerts", response_model=List[EscalationResponse])
def list_alerts(
    status: Optional[str] = Query("pending", description="Filter by pending, approved, or dismissed"),
    repo: ItemRepository = Depends(get_repo)
):
    """
    List escalations awaiting user action.
    Frontend polls this endpoint every 30s as specified in requirements.
    """
    escalations = repo.list_escalations(status=status)
    return [escalation_to_response(e) for e in escalations]


@app.post("/alerts/{id}/approve", response_model=EscalationResponse)
def approve_alert(
    id: str,
    body: Optional[ActionApprovalRequest] = None,
    repo: ItemRepository = Depends(get_repo)
):
    """
    Approves a pre-drafted action (1-click approval).
    Marks escalation approved and transitions state.
    """
    escalation = repo.resolve_escalation(id, "approved")
    if not escalation:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Update item status if it was a return or recall
    if escalation.type == "return_window":
        repo.update_item_status(escalation.item_id, "returned")
    elif escalation.type == "recall_match":
        repo.update_item_status(escalation.item_id, "claimed")

    return escalation_to_response(escalation)


@app.post("/alerts/{id}/dismiss", response_model=EscalationResponse)
def dismiss_alert(id: str, repo: ItemRepository = Depends(get_repo)):
    """Dismisses an escalation without taking action."""
    escalation = repo.resolve_escalation(id, "dismissed")
    if not escalation:
        raise HTTPException(status_code=404, detail="Alert not found")
    return escalation_to_response(escalation)


@app.get("/events")
@app.get("/events/recent")
def get_recent_events():
    """Returns recent broadcast events from Observer pattern notifiers."""
    return {
        "in_app_events": in_app_notifier.recent_events,
        "telegram_dispatches": list(reversed(telegram_notifier.notification_log)),
        "active_observers_count": len(escalation_publisher._observers)
    }



@app.get("/recalls/live-search")
def live_search_recalls(q: str = Query(..., description="Product name or keyword to query live in CPSC database")):
    """
    Live Federal Recall Radar:
    Directly queries the U.S. Consumer Product Safety Commission (CPSC) API in real time.
    """
    from app.services.cpsc_client import cpsc_client
    matches = cpsc_client.query_live_cpsc(q)
    return {
        "query": q,
        "count": len(matches),
        "source": "U.S. Consumer Product Safety Commission (CPSC SaferProducts API)",
        "results": matches
    }


@app.post("/recalls/protect")
def protect_recalled_product(payload: dict, repo: ItemRepository = Depends(get_repo)):
    """
    Shield a recalled product directly from live federal search results into Aegis.
    Creates tracked item and immediate critical recall escalation with pre-drafted claim.
    """
    from datetime import datetime, timezone, timedelta
    from app.schemas import ParsedReceipt
    from app.agents.draft_agent import draft_agent
    from app.publisher import escalation_publisher

    name = payload.get("title") or payload.get("product_name") or "Recalled Product"
    merchant = payload.get("merchant") or "Authorized Retailer"
    price = float(payload.get("price") or 49.99)
    recall_id = payload.get("recall_id") or "CPSC-LIVE"
    hazard = payload.get("hazard") or "Identified Consumer Safety Hazard"
    remedy = payload.get("remedy") or "Full Refund or Free Replacement"
    contact = payload.get("consumer_contact") or f"{merchant} Recall Support"

    now = datetime.now(timezone.utc)
    parsed = ParsedReceipt(
        name=name,
        merchant=merchant,
        price=price,
        currency="USD",
        purchase_date=now - timedelta(days=15),
        category="General",
        model_number=payload.get("model_number"),
        return_window_days=30,
        warranty_days=365
    )

    item = repo.create_item(parsed, raw_input=f"Live CPSC Import: #{recall_id} - {name}")
    
    # Generate multi-strategy draft
    draft = draft_agent.generate_recall_draft(
        item_name=name,
        merchant=merchant,
        cpsc_recall_id=recall_id,
        recall_title=name,
        hazard=hazard,
        remedy=remedy,
        consumer_contact=contact
    )

    # Generate escalation
    escalation = repo.create_escalation(
        item_id=item.id,
        escalation_type="recall_match",
        severity="critical",
        reason=f"LIVE CPSC SAFETY RECALL #{recall_id}: {hazard}. Approved federal remedy: {remedy}.",
        draft_action=draft,
        draft_recipient=contact,
        cpsc_recall_id=recall_id
    )

    # Broadcast via Observer pattern
    escalation_publisher.publish(escalation, item_name=name, merchant=merchant)

    refreshed = repo.get_item(item.id)
    return item_to_response(refreshed or item)


@app.post("/demo/seed")
def seed_demo_data(repo: ItemRepository = Depends(get_repo)):
    """
    1-Click Seed Endpoint for Hackathon Evaluation:
    Loads sample receipts demonstrating:
    - 2 Routine items (Stay 100% silent)
    - 1 Safety Recall item (Immediate 🚨 recall escalation + claim draft)
    - 1 Expiring Return item (Immediate ⏰ deadline warning + return draft)
    """
    demo_receipts = get_demo_receipts()
    results = []

    for receipt_data in demo_receipts:
        receipt_input = ReceiptInput(
            raw_text=receipt_data["raw_text"],
            format=receipt_data["format"]
        )
        parsed = ingestion_agent.process_receipt(receipt_input)
        
        # Override with exact metadata purchase dates for deterministic time offsets
        meta = receipt_data.get("metadata", {})
        if "purchase_date" in meta:
            parsed.purchase_date = meta["purchase_date"]
        if "name" in meta:
            parsed.name = meta["name"]
        if "merchant" in meta:
            parsed.merchant = meta["merchant"]
        if "price" in meta:
            parsed.price = meta["price"]
        if "model_number" in meta:
            parsed.model_number = meta["model_number"]
        if "return_window_days" in meta:
            parsed.return_window_days = meta["return_window_days"]
        if "warranty_days" in meta:
            parsed.warranty_days = meta["warranty_days"]

        item = repo.create_item(parsed, raw_input=receipt_data["raw_text"])
        triage_agent.evaluate_item(item, repo)
        
        refreshed = repo.get_item(item.id)
        results.append(item_to_response(refreshed or item))

    return {
        "message": f"Successfully seeded {len(results)} demonstration purchases.",
        "items": results
    }


@app.post("/demo/reset")
def reset_database(repo: ItemRepository = Depends(get_repo)):
    """Resets all items and alerts for clean demonstration testing."""
    items = repo.list_items()
    for it in items:
        repo.delete_item(it.id)
    return {"message": "All items and escalations have been reset."}


@app.post("/demo/simulate-expiry")
def simulate_expiry(payload: Optional[dict] = None, repo: ItemRepository = Depends(get_repo)):
    """
    Simulated Time-Travel for Video/Live Demos:
    Fast-forwards an item to Day 28 of its return window.
    Triggers Min-Heap deadline re-evaluation and causes TriageAgent to surface
    an urgent closing return deadline alert with a pre-drafted return claim.
    """
    from datetime import timedelta
    payload = payload or {}
    item_id = payload.get("item_id")

    target_item = None
    if item_id:
        target_item = repo.get_item(item_id)
    else:
        # Find first routine item
        items = repo.list_items(status="active")
        for it in items:
            has_pending_escalations = any(e.status == "pending" for e in it.escalations)
            if not has_pending_escalations:
                target_item = it
                break

    if not target_item:
        # Seed if database was empty
        demo_receipts = get_demo_receipts()
        routine_sample = demo_receipts[0]
        parsed = ingestion_agent.process_receipt(ReceiptInput(raw_text=routine_sample["raw_text"], format=routine_sample["format"]))
        target_item = repo.create_item(parsed, raw_input=routine_sample["raw_text"])

    # Fast forward: 2 days left in return window
    now = datetime.now(timezone.utc)
    target_item.purchase_date = now - timedelta(days=target_item.return_window_days - 2)
    target_item.return_deadline = target_item.purchase_date + timedelta(days=target_item.return_window_days)
    repo.db.commit()
    repo.db.refresh(target_item)

    # Re-sync in Min-Heap
    global_deadline_heap.push(target_item.id, target_item.nearest_deadline)

    # Run Triage Agent
    escalations = triage_agent.evaluate_item(target_item, repo)

    refreshed = repo.get_item(target_item.id)
    return {
        "message": f"Time-traveled '{target_item.name}' to Day {target_item.return_window_days - 2}. Return window now expires in 2 days.",
        "item": item_to_response(refreshed or target_item),
        "escalations_created": len(escalations)
    }

