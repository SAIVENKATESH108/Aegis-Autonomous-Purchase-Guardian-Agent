"""
SQLAlchemy ORM Models for Aegis.

Design Pattern: Data Modeling
These models represent the persisted state of tracked purchases and generated escalations.
All database access to these models is strictly encapsulated within ItemRepository
(Repository Pattern) - no direct ORM queries are permitted elsewhere in the application.
"""

from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.config import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Item(Base):
    """
    Represents a tracked purchase receipt.
    Monitored for return window expiration, warranty lifecycle, and safety recalls.
    """
    __tablename__ = "items"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    name = Column(String(255), nullable=False, index=True)
    merchant = Column(String(255), nullable=False)
    price = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="USD")
    purchase_date = Column(DateTime, nullable=False, default=utc_now)
    category = Column(String(100), nullable=False, default="General")
    model_number = Column(String(100), nullable=True)
    
    # Deadlines computed from purchase_date + window days
    return_window_days = Column(Integer, nullable=False, default=30)
    return_deadline = Column(DateTime, nullable=False, index=True)
    warranty_days = Column(Integer, nullable=False, default=365)
    warranty_deadline = Column(DateTime, nullable=False)

    # Status: 'active', 'returned', 'claimed', 'archived'
    status = Column(String(50), nullable=False, default="active")
    raw_input = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    # Relationship to escalations
    escalations = relationship(
        "Escalation",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="desc(Escalation.created_at)"
    )

    @property
    def nearest_deadline(self) -> datetime:
        """Helper to find the soonest applicable deadline."""
        if self.return_deadline and self.warranty_deadline:
            return min(self.return_deadline, self.warranty_deadline)
        return self.return_deadline or self.warranty_deadline or self.purchase_date


class Escalation(Base):
    """
    Represents an actionable alert generated when an item requires human decision:
    1. return_window: Return window closing soon (< 5 days).
    2. warranty_expiring: Warranty ending soon (< 14 days).
    3. recall_match: Product matches an official CPSC safety recall.
    """
    __tablename__ = "escalations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    item_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Type: 'return_window', 'warranty_expiring', 'recall_match'
    type = Column(String(50), nullable=False, index=True)
    
    # Severity: 'warning', 'urgent', 'critical'
    severity = Column(String(50), nullable=False, default="warning")
    
    reason = Column(Text, nullable=False)
    draft_action = Column(Text, nullable=False)
    draft_recipient = Column(String(255), nullable=True)
    
    # Status: 'pending', 'approved', 'dismissed'
    status = Column(String(50), nullable=False, default="pending", index=True)
    
    cpsc_recall_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    resolved_at = Column(DateTime, nullable=True)

    item = relationship("Item", back_populates="escalations")
