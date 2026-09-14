"""
Repository Pattern Implementation for Aegis Guardian.

Design Pattern: REPOSITORY PATTERN
Justification:
ItemRepository completely encapsulates all database interactions (SQLAlchemy ORM and SQLite).
This decouples the business logic, Strands agents, and API route controllers from data access details.
It also ensures that any database mutation (insert, update, delete) automatically updates the
in-memory Min-Heap (`DeadlineHeap`) in O(log n) time, ensuring zero discrepancy between the
persisted database state and the priority queue.
NO raw SQL or direct ORM session queries are permitted outside this class.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models import Item, Escalation, utc_now
from app.schemas import ParsedReceipt
from app.data_structures import global_deadline_heap


class ItemRepository:
    """
    Encapsulates all persistence operations for Items and Escalations.
    """
    def __init__(self, db: Session):
        self.db = db

    def create_item(self, parsed: ParsedReceipt, raw_input: Optional[str] = None) -> Item:
        """
        Persists a new tracked purchase item and registers it in the DeadlineHeap.
        """
        now = utc_now()
        # Compute deadlines
        from datetime import timedelta
        p_date = parsed.purchase_date
        if p_date.tzinfo is None:
            p_date = p_date.replace(tzinfo=timezone.utc)
            
        return_deadline = p_date + timedelta(days=parsed.return_window_days)
        warranty_deadline = p_date + timedelta(days=parsed.warranty_days)

        item = Item(
            name=parsed.name,
            merchant=parsed.merchant,
            price=parsed.price,
            currency=parsed.currency,
            purchase_date=p_date,
            category=parsed.category,
            model_number=parsed.model_number,
            return_window_days=parsed.return_window_days,
            return_deadline=return_deadline,
            warranty_days=parsed.warranty_days,
            warranty_deadline=warranty_deadline,
            status="active",
            raw_input=raw_input,
            created_at=now,
            updated_at=now
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)

        # Update Min-Heap
        global_deadline_heap.push(
            item_id=item.id,
            deadline=item.nearest_deadline,
            metadata={
                "id": item.id,
                "name": item.name,
                "merchant": item.merchant,
                "price": item.price,
                "category": item.category,
                "status": item.status,
                "return_deadline": item.return_deadline.isoformat(),
                "warranty_deadline": item.warranty_deadline.isoformat()
            }
        )

        return item

    def get_item(self, item_id: str) -> Optional[Item]:
        """Fetch item by unique identifier."""
        return self.db.query(Item).filter(Item.id == item_id).first()

    def list_items(self, status: Optional[str] = None) -> List[Item]:
        """
        Fetch all tracked items.
        Order is primarily determined by nearest deadline via min-heap,
        or sorted by nearest deadline in DB as fallback.
        """
        query = self.db.query(Item)
        if status:
            query = query.filter(Item.status == status)
        
        # Sort by nearest deadline ascending
        items = query.all()
        # Sort in memory by nearest_deadline
        items.sort(key=lambda x: x.nearest_deadline)
        return items

    def update_item_status(self, item_id: str, new_status: str) -> Optional[Item]:
        """Update item lifecycle status (active, returned, claimed, archived)."""
        item = self.get_item(item_id)
        if not item:
            return None
        item.status = new_status
        item.updated_at = utc_now()
        self.db.commit()
        self.db.refresh(item)

        if new_status in ("returned", "claimed", "archived"):
            global_deadline_heap.remove(item_id)
        else:
            global_deadline_heap.push(item.id, item.nearest_deadline)
        return item

    def delete_item(self, item_id: str) -> bool:
        """Deletes item and removes from heap."""
        item = self.get_item(item_id)
        if not item:
            return False
        self.db.delete(item)
        self.db.commit()
        global_deadline_heap.remove(item_id)
        return True

    def create_escalation(
        self,
        item_id: str,
        escalation_type: str,
        severity: str,
        reason: str,
        draft_action: str,
        draft_recipient: Optional[str] = None,
        cpsc_recall_id: Optional[str] = None
    ) -> Escalation:
        """
        Persists a new escalation alert requiring user decision.
        """
        # Check if identical pending alert already exists
        existing = (
            self.db.query(Escalation)
            .filter(
                Escalation.item_id == item_id,
                Escalation.type == escalation_type,
                Escalation.status == "pending"
            )
            .first()
        )
        if existing:
            return existing

        now = utc_now()
        escalation = Escalation(
            item_id=item_id,
            type=escalation_type,
            severity=severity,
            reason=reason,
            draft_action=draft_action,
            draft_recipient=draft_recipient,
            cpsc_recall_id=cpsc_recall_id,
            status="pending",
            created_at=now
        )
        self.db.add(escalation)
        self.db.commit()
        self.db.refresh(escalation)
        return escalation

    def get_escalation(self, escalation_id: str) -> Optional[Escalation]:
        """Fetch escalation by id."""
        return self.db.query(Escalation).filter(Escalation.id == escalation_id).first()

    def list_escalations(self, status: Optional[str] = None) -> List[Escalation]:
        """List escalations with optional status filter (e.g. pending)."""
        query = self.db.query(Escalation).order_by(desc(Escalation.created_at))
        if status:
            query = query.filter(Escalation.status == status)
        return query.all()

    def resolve_escalation(self, escalation_id: str, new_status: str) -> Optional[Escalation]:
        """
        Approve or dismiss an escalation.
        Status: 'approved' or 'dismissed'.
        """
        escalation = self.get_escalation(escalation_id)
        if not escalation:
            return None
        escalation.status = new_status
        escalation.resolved_at = utc_now()
        self.db.commit()
        self.db.refresh(escalation)
        return escalation

    def get_stats(self) -> dict:
        """Computes aggregate guardian intelligence statistics."""
        total_items = self.db.query(func.count(Item.id)).scalar() or 0
        total_value = self.db.query(func.sum(Item.price)).scalar() or 0.0
        pending_alerts = self.db.query(func.count(Escalation.id)).filter(Escalation.status == "pending").scalar() or 0
        recall_alerts = (
            self.db.query(func.count(Escalation.id))
            .filter(Escalation.type == "recall_match", Escalation.status == "pending")
            .scalar() or 0
        )
        
        # Next deadline via heap
        nearest_peek = global_deadline_heap.peek()
        nearest_item_title = None
        nearest_ts = None
        if nearest_peek:
            nearest_ts, item_id, meta = nearest_peek
            nearest_item_title = meta.get("name")
            nearest_date = datetime.fromtimestamp(nearest_ts, tz=timezone.utc)
        else:
            nearest_date = None

        return {
            "total_items_monitored": total_items,
            "active_alerts_count": pending_alerts,
            "recalls_detected_count": recall_alerts,
            "total_protected_value": round(float(total_value), 2),
            "nearest_deadline_item": nearest_item_title,
            "nearest_deadline_date": nearest_date
        }

    def sync_heap(self):
        """Re-populates min-heap from active database records on startup."""
        active_items = self.db.query(Item).filter(Item.status == "active").all()
        for item in active_items:
            global_deadline_heap.push(
                item_id=item.id,
                deadline=item.nearest_deadline,
                metadata={
                    "id": item.id,
                    "name": item.name,
                    "merchant": item.merchant,
                    "price": item.price,
                    "category": item.category,
                    "status": item.status,
                    "return_deadline": item.return_deadline.isoformat(),
                    "warranty_deadline": item.warranty_deadline.isoformat()
                }
            )
