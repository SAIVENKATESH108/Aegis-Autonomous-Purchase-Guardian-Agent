"""
Observer Pattern Implementation for Aegis Escalations.

Design Pattern: OBSERVER PATTERN
Justification:
When an escalation (return deadline warning, warranty alert, or CPSC recall match) is generated,
multiple decoupled notification sinks need to be informed without coupling the TriageAgent
directly to specific delivery channels.
- `InAppFeedNotifier`: Publishes alerts to the in-memory/in-app alert feed for frontend polling/streaming.
- `TelegramNotifier`: (Stubbed / Configurable) formats rich notifications for Telegram chat channels.
Additional sinks (e.g. Email, SMS, Webhooks) can easily be attached by implementing the `EscalationObserver` interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime, timezone
import logging

from app.models import Escalation

logger = logging.getLogger("aegis.publisher")


class EscalationObserver(ABC):
    """Abstract Observer interface."""
    @abstractmethod
    def notify(self, escalation: Escalation, item_name: str, merchant: str):
        pass


class InAppFeedNotifier(EscalationObserver):
    """
    Observer: Appends escalation events to an in-memory broadcast log
    for real-time consumption by the frontend application.
    """
    def __init__(self):
        self._recent_events: List[Dict[str, Any]] = []

    def notify(self, escalation: Escalation, item_name: str, merchant: str):
        event = {
            "event_type": "ESCALATION_PUBLISHED",
            "escalation_id": escalation.id,
            "item_id": escalation.item_id,
            "item_name": item_name,
            "merchant": merchant,
            "type": escalation.type,
            "severity": escalation.severity,
            "reason": escalation.reason,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self._recent_events.append(event)
        # Keep last 100 events
        if len(self._recent_events) > 100:
            self._recent_events.pop(0)
        logger.info(f"[InAppFeed] Dispatched alert for {item_name} (Severity: {escalation.severity})")

    @property
    def recent_events(self) -> List[Dict[str, Any]]:
        return list(reversed(self._recent_events))


class TelegramNotifier(EscalationObserver):
    """
    Observer: Formats and dispatches (or stubs) alerts to Telegram.
    Can be activated by setting TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
    """
    def __init__(self, bot_token: str = "", chat_id: str = ""):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.notification_log: List[str] = []

    def notify(self, escalation: Escalation, item_name: str, merchant: str):
        # Format rich Telegram message
        icon = "🚨" if escalation.type == "recall_match" else "⏰"
        severity_tag = escalation.severity.upper()
        
        msg = (
            f"{icon} *[AEGIS GUARDIAN ALERT: {severity_tag}]*\n"
            f"*Item:* {item_name}\n"
            f"*Merchant:* {merchant}\n"
            f"*Type:* {escalation.type}\n"
            f"*Reason:* {escalation.reason}\n\n"
            f"_Action required: A pre-drafted claim is ready for 1-click approval in Aegis Dashboard._"
        )
        self.notification_log.append(msg)
        
        if self.bot_token and self.chat_id:
            logger.info(f"[TelegramNotifier] Real dispatch to chat {self.chat_id}: {item_name}")
            # Real HTTP dispatch would happen here: httpx.post(...)
        else:
            logger.info(f"[TelegramNotifier (Stubbed)] Broadcast prepared:\n{msg}")


class EscalationPublisher:
    """
    Subject / Publisher in the Observer Pattern.
    Maintains list of observers and broadcasts escalations when triggered.
    """
    def __init__(self):
        self._observers: List[EscalationObserver] = []

    def attach(self, observer: EscalationObserver):
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: EscalationObserver):
        if observer in self._observers:
            self._observers.remove(observer)

    def publish(self, escalation: Escalation, item_name: str = "", merchant: str = ""):
        for observer in self._observers:
            try:
                observer.notify(escalation, item_name, merchant)
            except Exception as e:
                logger.error(f"Error in escalation observer {observer}: {e}")


# Global publisher instance with attached default observers
escalation_publisher = EscalationPublisher()
in_app_notifier = InAppFeedNotifier()
telegram_notifier = TelegramNotifier()

escalation_publisher.attach(in_app_notifier)
escalation_publisher.attach(telegram_notifier)
