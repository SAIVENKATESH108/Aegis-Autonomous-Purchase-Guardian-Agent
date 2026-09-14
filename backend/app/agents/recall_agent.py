"""
RecallCheckAgent for Aegis Guardian.

Queries the CPSC (Consumer Product Safety Commission) Recalls API per tracked purchase item.
Uses LRU caching to eliminate redundant lookups for recurring product and model names.
"""

from typing import Optional, Dict, Any, List
import logging
from app.services.cpsc_client import cpsc_client

logger = logging.getLogger("aegis.recall_agent")


class RecallCheckAgent:
    """
    Strands Agent component responsible for scanning purchases against federal recall announcements.
    """
    def __init__(self):
        self.client = cpsc_client

    def check_item(self, item_name: str, model_number: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Executes an LRU-cached recall audit for an item.
        Returns matching recall metadata or None if clean.
        """
        matches = self.client.search_recalls(product_name=item_name, model_number=model_number)
        if matches:
            top_match = matches[0]
            logger.warning(
                f"[RecallCheckAgent] MATCH FOUND: Item '{item_name}' matches CPSC Recall #{top_match.get('RecallNumber')} - {top_match.get('Title')}"
            )
            return {
                "recall_id": top_match.get("RecallNumber") or str(top_match.get("RecallID")),
                "title": top_match.get("Title"),
                "description": top_match.get("Description"),
                "hazard": self._extract_hazard(top_match),
                "remedy": self._extract_remedy(top_match),
                "url": top_match.get("URL"),
                "consumer_contact": top_match.get("ConsumerContact")
            }
        return None

    def _extract_hazard(self, recall: Dict[str, Any]) -> str:
        hazards = recall.get("Hazards", [])
        if hazards and isinstance(hazards, list):
            first = hazards[0]
            if isinstance(first, dict):
                return first.get("Name") or first.get("HazardType") or "Safety Hazard"
        return "Product Safety Hazard"

    def _extract_remedy(self, recall: Dict[str, Any]) -> str:
        remedies = recall.get("Remedies", [])
        if remedies and isinstance(remedies, list):
            first = remedies[0]
            if isinstance(first, dict):
                return first.get("Name") or "Full Refund / Replacement"
        return "Full Refund / Replacement"


recall_check_agent = RecallCheckAgent()
