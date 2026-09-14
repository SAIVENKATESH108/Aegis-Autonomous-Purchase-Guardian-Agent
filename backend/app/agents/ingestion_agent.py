"""
IngestionAgent for Aegis Guardian.

Combines the Factory Pattern (ReceiptParserFactory) with Strands Agents SDK to extract
and normalize purchase details (item name, merchant, price, purchase date, category,
model number, return window days, warranty period).
"""

import json
import logging
from typing import Optional
from datetime import datetime, timezone

from app.schemas import ReceiptInput, ParsedReceipt
from app.agents.receipt_factory import ReceiptParserFactory
from app.config import bedrock_singleton

logger = logging.getLogger("aegis.ingestion")


class IngestionAgent:
    """
    Strands Agent for parsing incoming purchases into standardized entities.
    """
    def __init__(self):
        self.bedrock_config = bedrock_singleton

    def process_receipt(self, receipt_input: ReceiptInput) -> ParsedReceipt:
        """
        1. Selects concrete parser via ReceiptParserFactory.
        2. Parses the raw input.
        3. If Bedrock LLM is active, performs enhanced entity resolution;
           otherwise returns the normalized factory result.
        """
        parser = ReceiptParserFactory.get_parser(receipt_input)
        parsed = parser.parse(receipt_input)

        # Enhance with Bedrock if live and not disabled by permission error
        if self.bedrock_config.is_live_bedrock and not getattr(self.bedrock_config, "_bedrock_disabled", False) and receipt_input.raw_text:
            enhanced = self._refine_with_llm(receipt_input.raw_text, parsed)
            if enhanced:
                return enhanced

        return parsed

    def _refine_with_llm(self, raw_text: str, fallback: ParsedReceipt) -> Optional[ParsedReceipt]:
        """Optionally refines unstructured receipts using Strands Agent + Bedrock."""
        try:
            from strands import Agent
            agent = Agent(
                model=self.bedrock_config.model,
                system_prompt=(
                    "You are a receipt parsing specialist. Given the receipt text, extract a JSON object with: "
                    "name, merchant, price (float), purchase_date (YYYY-MM-DD), category, model_number, "
                    "return_window_days (int), warranty_days (int). Output only the JSON object."
                )
            )
            result = agent(f"Receipt text:\n{raw_text}")
            resp_str = ""
            if hasattr(result, "message") and isinstance(result.message, dict) and "content" in result.message:
                content = result.message["content"]
                if isinstance(content, list) and len(content) > 0 and isinstance(content[0], dict):
                    resp_str = content[0].get("text", "")
            if not resp_str:
                resp_str = str(result)
            # Extract JSON substring
            start = resp_str.find("{")
            end = resp_str.rfind("}") + 1
            if start != -1 and end != 0:
                data = json.loads(resp_str[start:end])
                p_date = fallback.purchase_date
                if data.get("purchase_date"):
                    try:
                        p_date = datetime.strptime(data["purchase_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    except Exception:
                        pass

                return ParsedReceipt(
                    name=data.get("name") or fallback.name,
                    merchant=data.get("merchant") or fallback.merchant,
                    price=float(data.get("price") or fallback.price),
                    currency="USD",
                    purchase_date=p_date,
                    category=data.get("category") or fallback.category,
                    model_number=data.get("model_number") or fallback.model_number,
                    return_window_days=int(data.get("return_window_days") or fallback.return_window_days),
                    warranty_days=int(data.get("warranty_days") or fallback.warranty_days),
                    confidence_score=0.98
                )
        except Exception as e:
            logger.warning(f"[IngestionAgent] LLM refinement fallback: {e}")
            setattr(self.bedrock_config, "_bedrock_disabled", True)
        return None


ingestion_agent = IngestionAgent()
