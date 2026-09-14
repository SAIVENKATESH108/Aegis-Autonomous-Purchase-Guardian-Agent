"""
Factory Pattern Implementation for Receipt Parsing.

Design Pattern: FACTORY PATTERN
Justification:
Consumers upload or paste receipts in varying formats: unstructured raw email/receipt text,
or structured e-commerce JSON webhooks/exports (Amazon, Shopify, etc.).
`ReceiptParserFactory` dynamically selects and instantiates the appropriate parser
(`TextReceiptParser` or `JsonReceiptParser`) based on the input type without exposing the
instantiation logic to the callers or the IngestionAgent.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import re
import json

from app.schemas import ReceiptInput, ParsedReceipt


RETAILER_POLICY_DB = {
    "amazon": {"name": "Amazon", "return_days": 30, "warranty_days": 365, "category": "General"},
    "best buy": {"name": "Best Buy", "return_days": 14, "warranty_days": 365, "category": "Electronics"},
    "apple": {"name": "Apple", "return_days": 14, "warranty_days": 365, "category": "Electronics"},
    "target": {"name": "Target", "return_days": 90, "warranty_days": 365, "category": "General"},
    "walmart": {"name": "Walmart", "return_days": 90, "warranty_days": 365, "category": "General"},
    "costco": {"name": "Costco", "return_days": 90, "warranty_days": 730, "category": "General"},
    "nike": {"name": "Nike", "return_days": 60, "warranty_days": 730, "category": "Apparel & Footwear"},
    "home depot": {"name": "The Home Depot", "return_days": 90, "warranty_days": 365, "category": "Home & Hardware"},
    "rei": {"name": "REI Co-op", "return_days": 365, "warranty_days": 365, "category": "Outdoor & Sports"},
    "sephora": {"name": "Sephora", "return_days": 30, "warranty_days": 180, "category": "Beauty & Personal Care"},
    "ikea": {"name": "IKEA", "return_days": 365, "warranty_days": 1825, "category": "Furniture & Home"},
    "nordstrom": {"name": "Nordstrom", "return_days": 180, "warranty_days": 365, "category": "Apparel & Luxury"},
    "wayfair": {"name": "Wayfair", "return_days": 30, "warranty_days": 365, "category": "Furniture & Home"},
    "peloton": {"name": "Peloton", "return_days": 30, "warranty_days": 365, "category": "Fitness Equipment"},
    "dewalt": {"name": "DeWalt", "return_days": 90, "warranty_days": 1095, "category": "Tools & Hardware"},
    "sony": {"name": "Sony", "return_days": 30, "warranty_days": 365, "category": "Electronics"},
}


class BaseReceiptParser(ABC):
    """Abstract Product in the Factory Pattern."""
    @abstractmethod
    def parse(self, input_data: ReceiptInput) -> ParsedReceipt:
        pass


class TextReceiptParser(BaseReceiptParser):
    """Concrete Parser for unstructured plaintext, email pastes, and OCR output."""
    def parse(self, input_data: ReceiptInput) -> ParsedReceipt:
        text = input_data.raw_text or ""
        lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
        lower_text = text.lower()
        
        # 1. Price extraction ($XX.XX)
        price = 0.0
        price_match = re.search(r"\$\s*([0-9]+(?:\.[0-9]{2})?)", text)
        if price_match:
            price = float(price_match.group(1))

        # 2. Date extraction (YYYY-MM-DD or MM/DD/YYYY)
        purchase_date = datetime.now(timezone.utc)
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})|(\d{1,2}/\d{1,2}/\d{2,4})", text)
        if date_match:
            try:
                date_str = date_match.group(0)
                if "-" in date_str:
                    purchase_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                else:
                    parts = date_str.split("/")
                    year = int(parts[2])
                    if year < 100:
                        year += 2000
                    purchase_date = datetime(year, int(parts[0]), int(parts[1]), tzinfo=timezone.utc)
            except Exception:
                pass

        # 3. Merchant extraction via real retailer knowledge base
        merchant = "Retailer"
        return_days = 30
        warranty_days = 365
        category = "General"

        for key, policy in RETAILER_POLICY_DB.items():
            if key in lower_text:
                merchant = policy["name"]
                return_days = policy["return_days"]
                warranty_days = policy["warranty_days"]
                category = policy["category"]
                break

        if merchant == "Retailer" and lines:
            merchant = lines[0][:40]

        # 4. Item Name extraction
        name = "Tracked Product"
        for line in lines:
            if any(k in line.lower() for k in ["item:", "product:", "item name:", "description:"]):
                name = re.sub(r"(?i)(item|product|description|item name)\s*:\s*", "", line).strip()
                break
        if name == "Tracked Product" and len(lines) > 1:
            for candidate in lines[1:5]:
                if not any(k in candidate.lower() for k in ["date", "order", "store", "total", "subtotal", "tax", "payment", "receipt"]):
                    name = candidate[:80]
                    break

        # 5. Model extraction
        model_number = None
        model_match = re.search(r"(?:model|sku|item id|upc)\s*:\s*([A-Za-z0-9\-_]+)", text, re.IGNORECASE)
        if model_match:
            model_number = model_match.group(1)

        # 6. Override Return window days if explicitly specified in receipt text
        return_match = re.search(r"(\d{1,3})\s*(?:-| )day(?:s)?\s*return", text, re.IGNORECASE)
        if return_match:
            return_days = int(return_match.group(1))

        # 7. Warranty days extraction (e.g. "1 year", "2-year", "18 months")
        warranty_days = 365
        if re.search(r"2\s*(?:-| )year", text, re.IGNORECASE):
            warranty_days = 730
        elif re.search(r"18\s*(?:-| )month", text, re.IGNORECASE):
            warranty_days = 540
        elif re.search(r"90\s*(?:-| )day", text, re.IGNORECASE):
            warranty_days = 90

        # Category heuristic
        category = "General"
        if any(w in lower_text for w in ["charger", "mouse", "keyboard", "laptop", "cable", "electronics", "led", "headphone"]):
            category = "Electronics"
        elif any(w in lower_text for w in ["shoe", "sneaker", "shirt", "pant", "apparel", "jacket"]):
            category = "Apparel & Footwear"
        elif any(w in lower_text for w in ["toy", "kid", "child", "baby", "toddler"]):
            category = "Toys & Kids"
        elif any(w in lower_text for w in ["mug", "coffee", "cooker", "pan", "blender", "kitchen"]):
            category = "Kitchen & Home"

        return ParsedReceipt(
            name=name,
            merchant=merchant,
            price=price,
            currency="USD",
            purchase_date=purchase_date,
            category=category,
            model_number=model_number,
            return_window_days=return_days,
            warranty_days=warranty_days,
            confidence_score=0.9
        )


class JsonReceiptParser(BaseReceiptParser):
    """Concrete Parser for structured JSON receipts and e-commerce webhooks."""
    def parse(self, input_data: ReceiptInput) -> ParsedReceipt:
        data = input_data.json_data or {}
        if not data and input_data.raw_text:
            try:
                data = json.loads(input_data.raw_text)
            except Exception:
                data = {}

        name = data.get("name") or data.get("item_name") or data.get("product_name") or "Tracked Product"
        merchant = data.get("merchant") or data.get("store") or data.get("retailer") or "Retailer"
        price = float(data.get("price") or data.get("total") or data.get("subtotal") or 0.0)
        currency = data.get("currency", "USD")
        
        # Parse date
        purchase_date = datetime.now(timezone.utc)
        date_raw = data.get("purchase_date") or data.get("date") or data.get("order_date")
        if date_raw:
            try:
                if isinstance(date_raw, str):
                    purchase_date = datetime.fromisoformat(date_raw.replace("Z", "+00:00"))
                elif isinstance(date_raw, (int, float)):
                    purchase_date = datetime.fromtimestamp(date_raw, tz=timezone.utc)
            except Exception:
                pass

        category = data.get("category", "General")
        model_number = data.get("model_number") or data.get("sku") or data.get("model")
        return_window_days = int(data.get("return_window_days") or data.get("return_days") or 30)
        warranty_days = int(data.get("warranty_days", 365))

        return ParsedReceipt(
            name=name,
            merchant=merchant,
            price=price,
            currency=currency,
            purchase_date=purchase_date,
            category=category,
            model_number=model_number,
            return_window_days=return_window_days,
            warranty_days=warranty_days,
            confidence_score=1.0
        )


class ReceiptParserFactory:
    """
    Factory Pattern: Creates the appropriate BaseReceiptParser.
    """
    @staticmethod
    def get_parser(input_data: ReceiptInput) -> BaseReceiptParser:
        fmt = (input_data.format or "").strip().lower()
        if fmt == "json" or input_data.json_data is not None:
            return JsonReceiptParser()
        
        # If raw_text starts with { or [, use JSON parser
        if input_data.raw_text and input_data.raw_text.strip().startswith(("{", "[")):
            return JsonReceiptParser()
            
        return TextReceiptParser()
