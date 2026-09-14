"""
Strategy Pattern and TriageAgent Implementation for Aegis Guardian.

Design Pattern: STRATEGY PATTERN
Justification:
Evaluation rules for purchases differ in logic, frequency, and risk severity:
- `ReturnWindowRule`: Time-based deadline calculation comparing current time against the vendor's policy.
- `WarrantyExpiringRule`: Time-based calculation for manufacturer protection period.
- `RecallMatchRule`: Network & semantic matching against federal CPSC safety databases.
The Strategy Pattern allows rules to be added, modified, or reordered dynamically without altering
the core `TriageAgent` reasoning loop. Each strategy implements a uniform `evaluate(item, context)` interface.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import logging

from app.models import Item, Escalation
from app.config import settings
from app.agents.recall_agent import recall_check_agent
from app.agents.draft_agent import draft_agent
from app.publisher import escalation_publisher

logger = logging.getLogger("aegis.triage")


class TriageRule(ABC):
    """
    Strategy Interface in the Strategy Pattern.
    Each rule inspects an item and decides whether an escalation must be surfaced.
    """
    @abstractmethod
    def evaluate(self, item: Item, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Returns escalation data dict if rule triggers, or None if the item is safe/routine.
        """
        pass


class RecallMatchRule(TriageRule):
    """
    Concrete Strategy: Checks if the item matches an active CPSC product safety recall.
    Priority: Highest (Critical safety hazard).
    """
    def evaluate(self, item: Item, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        recall_info = recall_check_agent.check_item(item.name, item.model_number)
        if not recall_info:
            return None

        # Pre-draft recall claim action
        draft = draft_agent.generate_recall_draft(
            item_name=item.name,
            merchant=item.merchant,
            cpsc_recall_id=recall_info["recall_id"],
            recall_title=recall_info["title"],
            hazard=recall_info["hazard"],
            remedy=recall_info["remedy"],
            consumer_contact=recall_info.get("consumer_contact")
        )

        return {
            "type": "recall_match",
            "severity": "critical",
            "cpsc_recall_id": recall_info["recall_id"],
            "reason": f"CRITICAL SAFETY RECALL (CPSC #{recall_info['recall_id']}): {recall_info['hazard']}. Remedy: {recall_info['remedy']}.",
            "draft_action": draft,
            "draft_recipient": recall_info.get("consumer_contact") or f"{item.merchant} / CPSC Remedy Dept"
        }


class ReturnWindowRule(TriageRule):
    """
    Concrete Strategy: Checks if return eligibility is ending soon (<= RETURN_WINDOW_WARNING_DAYS).
    """
    def evaluate(self, item: Item, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not item.return_deadline:
            return None

        now = datetime.now(timezone.utc)
        deadline = item.return_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        diff = deadline - now
        days_remaining = diff.total_seconds() / 86400.0

        # If already expired (> 0 days past) or plenty of time (> warning threshold), keep silent
        if days_remaining < 0:
            return None  # Window already passed, do not disturb user retroactively

        if days_remaining <= settings.RETURN_WINDOW_WARNING_DAYS:
            days_rounded = max(1, int(round(days_remaining)))
            p_date_str = item.purchase_date.strftime("%B %d, %Y")
            draft = draft_agent.generate_return_draft(
                item_name=item.name,
                merchant=item.merchant,
                price=item.price,
                purchase_date_str=p_date_str,
                days_left=days_rounded
            )

            return {
                "type": "return_window",
                "severity": "urgent" if days_remaining <= 2 else "warning",
                "cpsc_recall_id": None,
                "reason": f"Return window closing in {days_rounded} day(s) (Deadline: {deadline.strftime('%b %d, %Y')}). Original cost: ${item.price:.2f}.",
                "draft_action": draft,
                "draft_recipient": f"{item.merchant} Customer Care / Returns"
            }

        # Otherwise routine item: SILENT
        return None


class WarrantyExpiringRule(TriageRule):
    """
    Concrete Strategy: Checks if manufacturer warranty is expiring in <= WARRANTY_WARNING_DAYS.
    """
    def evaluate(self, item: Item, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not item.warranty_deadline:
            return None

        now = datetime.now(timezone.utc)
        deadline = item.warranty_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        diff = deadline - now
        days_remaining = diff.total_seconds() / 86400.0

        if 0 <= days_remaining <= settings.WARRANTY_WARNING_DAYS:
            days_rounded = max(1, int(round(days_remaining)))
            return {
                "type": "warranty_expiring",
                "severity": "warning",
                "cpsc_recall_id": None,
                "reason": f"Manufacturer warranty coverage expires in {days_rounded} day(s). Check unit for defects before coverage ends.",
                "draft_action": f"Notice to {item.merchant} / Manufacturer: Annual warranty coverage audit for {item.name}.",
                "draft_recipient": f"{item.merchant} Warranty Dept"
            }

        return None


class TriageAgent:
    """
    Context in the Strategy Pattern.
    Orchestrates the pluggable triage rules across tracked items.
    """
    def __init__(self, rules: Optional[List[TriageRule]] = None):
        # Default strategy chain ordered by priority
        self.rules = rules or [
            RecallMatchRule(),
            ReturnWindowRule(),
            WarrantyExpiringRule()
        ]

    def register_rule(self, rule: TriageRule):
        """Allows dynamic addition of custom triage policies."""
        self.rules.append(rule)

    def evaluate_item(self, item: Item, repository, context: Optional[Dict[str, Any]] = None) -> List[Escalation]:
        """
        Executes all registered strategy rules against an item.
        If any rule produces an escalation, it creates it in the repository
        and publishes it to subscribed observers (In-App Feed, Telegram).
        """
        ctx = context or {}
        escalations_created = []

        for rule in self.rules:
            result = rule.evaluate(item, ctx)
            if result:
                escalation = repository.create_escalation(
                    item_id=item.id,
                    escalation_type=result["type"],
                    severity=result["severity"],
                    reason=result["reason"],
                    draft_action=result["draft_action"],
                    draft_recipient=result.get("draft_recipient"),
                    cpsc_recall_id=result.get("cpsc_recall_id")
                )
                escalations_created.append(escalation)

                # Broadcast via Observer Pattern
                escalation_publisher.publish(
                    escalation=escalation,
                    item_name=item.name,
                    merchant=item.merchant
                )

        return escalations_created


triage_agent = TriageAgent()
