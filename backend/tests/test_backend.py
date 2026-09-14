"""
Automated unit and integration test suite for Aegis Backend.
Tests:
- Factory Pattern (ReceiptParserFactory)
- Repository Pattern (ItemRepository) & SQLite CRUD
- Min-Heap priority ordering (DeadlineHeap)
- LRU Cache eviction and retrieval (LRUProductCache)
- Strategy Pattern (TriageAgent & TriageRules)
- Observer Pattern (EscalationPublisher & Notifiers)
- Seed demonstration data and silent vs escalate behavior
"""

from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import Base
from app.models import Item, Escalation
from app.schemas import ReceiptInput, ParsedReceipt
from app.repository import ItemRepository
from app.data_structures import DeadlineHeap, LRUProductCache
from app.publisher import EscalationPublisher, InAppFeedNotifier, TelegramNotifier
from app.agents.receipt_factory import ReceiptParserFactory, TextReceiptParser, JsonReceiptParser
from app.agents.triage_agent import TriageAgent, ReturnWindowRule, RecallMatchRule, WarrantyExpiringRule
from app.services.seed_data import get_demo_receipts


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_factory_pattern():
    """Verify ReceiptParserFactory selects correct parser based on input format."""
    text_input = ReceiptInput(raw_text="Best Buy Receipt $49.99 2024-01-01", format="text")
    json_input = ReceiptInput(json_data={"name": "Headphones", "price": 99.0}, format="json")
    json_str_input = ReceiptInput(raw_text='{"name": "Mouse", "price": 29.0}', format="text")

    parser1 = ReceiptParserFactory.get_parser(text_input)
    assert isinstance(parser1, TextReceiptParser)

    parser2 = ReceiptParserFactory.get_parser(json_input)
    assert isinstance(parser2, JsonReceiptParser)

    parser3 = ReceiptParserFactory.get_parser(json_str_input)
    assert isinstance(parser3, JsonReceiptParser)

    parsed = parser1.parse(text_input)
    assert parsed.price == 49.99
    assert parsed.merchant == "Best Buy"


def test_min_heap_deadline_prioritization():
    """Verify Min-Heap accurately prioritizes nearest deadlines in O(log n)."""
    heap = DeadlineHeap()
    now = datetime.now(timezone.utc)

    # Item A: Deadline in 10 days
    heap.push("item_a", now + timedelta(days=10), {"name": "Item A"})
    # Item B: Deadline in 2 days (urgent!)
    heap.push("item_b", now + timedelta(days=2), {"name": "Item B"})
    # Item C: Deadline in 5 days
    heap.push("item_c", now + timedelta(days=5), {"name": "Item C"})

    # Peek should return Item B
    peeked = heap.peek()
    assert peeked is not None
    assert peeked[1] == "item_b"

    # Sorted list should be [Item B, Item C, Item A]
    sorted_items = heap.get_items_sorted()
    assert len(sorted_items) == 3
    assert sorted_items[0]["item_id"] == "item_b"
    assert sorted_items[1]["item_id"] == "item_c"
    assert sorted_items[2]["item_id"] == "item_a"

    # Pop earliest
    popped = heap.pop()
    assert popped[1] == "item_b"
    assert len(heap) == 2


def test_lru_cache_behavior():
    """Verify LRU cache capacity eviction and hit/miss mechanics."""
    cache = LRUProductCache(capacity=2, ttl_seconds=60)
    
    cache.set("product_a", {"recall": False})
    cache.set("product_b", {"recall": True})
    assert len(cache) == 2
    assert cache.get("product_a") is not None

    # Adding third item should evict product_b (since product_a was just accessed)
    cache.set("product_c", {"recall": True})
    assert len(cache) == 2
    assert cache.get("product_b") is None
    assert cache.get("product_a") is not None
    assert cache.get("product_c") is not None


def test_observer_pattern():
    """Verify EscalationPublisher notifies both InAppFeedNotifier and TelegramNotifier."""
    publisher = EscalationPublisher()
    in_app = InAppFeedNotifier()
    telegram = TelegramNotifier()

    publisher.attach(in_app)
    publisher.attach(telegram)

    mock_escalation = Escalation(
        id="esc-1",
        item_id="item-1",
        type="recall_match",
        severity="critical",
        reason="CPSC Recall for battery hazard",
        draft_action="Subject: Claim..."
    )

    publisher.publish(mock_escalation, item_name="Finger Light Toys", merchant="Amazon")

    assert len(in_app.recent_events) == 1
    assert in_app.recent_events[0]["item_name"] == "Finger Light Toys"
    assert len(telegram.notification_log) == 1
    assert "Finger Light Toys" in telegram.notification_log[0]


def test_triage_silent_vs_escalation(db_session):
    """
    Verify the core Aegis value proposition:
    - Routine item with 20 days left: Stays 100% silent (0 escalations).
    - Item matching CPSC recall: Creates critical escalation.
    """
    repo = ItemRepository(db_session)
    triage = TriageAgent()
    now = datetime.now(timezone.utc)

    # 1. Routine Safe Item (Anker Charger, purchased 10 days ago, 30-day window -> 20 days left)
    routine_parsed = ParsedReceipt(
        name="Anker 65W Fast Charger",
        merchant="Best Buy",
        price=39.99,
        currency="USD",
        purchase_date=now - timedelta(days=10),
        return_window_days=30,
        warranty_days=365
    )
    routine_item = repo.create_item(routine_parsed)
    routine_escalations = triage.evaluate_item(routine_item, repo)
    assert len(routine_escalations) == 0, "Routine items must remain completely silent!"

    # 2. Recalled Item (Cade Finger Light Toys)
    recalled_parsed = ParsedReceipt(
        name="Cade Electronic Finger Light Toys",
        merchant="Amazon",
        price=14.99,
        currency="USD",
        purchase_date=now - timedelta(days=14),
        model_number="CADE-FL-100",
        return_window_days=30,
        warranty_days=90
    )
    recalled_item = repo.create_item(recalled_parsed)
    recalled_escalations = triage.evaluate_item(recalled_item, repo)
    assert len(recalled_escalations) > 0, "Recalled item must generate an immediate escalation!"
    assert recalled_escalations[0].type == "recall_match"
    assert recalled_escalations[0].severity == "critical"
    assert "CPSC" in recalled_escalations[0].reason
    assert "Subject:" in recalled_escalations[0].draft_action
