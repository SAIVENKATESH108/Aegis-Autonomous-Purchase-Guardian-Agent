"""
Seeded Sample Receipts for Aegis Demo.

Fulfills hackathon requirement:
- 2 routine purchases that stay completely silent (no user disturbance)
- 1 purchase matching a CPSC safety recall (immediate amber/red escalation with pre-drafted claim)
- 1 purchase closing in on its return window (urgent deadline escalation with pre-drafted return request)
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

def get_demo_receipts() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)

    return [
        {
            "raw_text": """
BEST BUY RECEIPT #BB-889104
Date: {(now - timedelta(days=10)).strftime('%Y-%m-%d')}
Store: Best Buy Store #0412
Item: Anker 65W Nano II GaN USB-C Fast Wall Charger
SKU: 6469442
Price: $39.99
Payment: Apple Pay (Visa ending 4129)
Return Policy: 30 days for My Best Buy Members
Warranty: 18 months Anker Manufacturer Protection
            """,
            "format": "text",
            "metadata": {
                "name": "Anker 65W Nano II GaN Fast Wall Charger",
                "merchant": "Best Buy",
                "price": 39.99,
                "currency": "USD",
                "purchase_date": now - timedelta(days=10),
                "category": "Electronics",
                "model_number": "A2663121",
                "return_window_days": 30,
                "warranty_days": 540,
                "expected_outcome": "Silent Monitoring (20 days remaining, CPSC Clean)"
            }
        },
        {
            "raw_text": """
NIKE OFFICIAL STORE ONLINE
Order: #NKE-49912093
Purchased: {(now - timedelta(days=8)).strftime('%Y-%m-%d')}
Customer: Alex Morgan
Product: Nike Air Zoom Pegasus 40 Running Shoes (Size 10.5, Black/White)
Item ID: DV3853-001
Subtotal: $129.99
Tax: $10.40
Total: $140.39
Nike Membership Benefit: 60-day hassle-free returns & 2-year footwear warranty
            """,
            "format": "text",
            "metadata": {
                "name": "Nike Air Zoom Pegasus 40 Running Shoes",
                "merchant": "Nike Official Store",
                "price": 129.99,
                "currency": "USD",
                "purchase_date": now - timedelta(days=8),
                "category": "Apparel & Footwear",
                "model_number": "DV3853-001",
                "return_window_days": 60,
                "warranty_days": 730,
                "expected_outcome": "Silent Monitoring (52 days remaining, CPSC Clean)"
            }
        },
        {
            "raw_text": """
AMAZON ORDER CONFIRMATION
Order Placed: {(now - timedelta(days=14)).strftime('%Y-%m-%d')}
Order ID: #114-8923412-9012411
Sold by: Cade Direct US
Item: Cade Electronic Finger Light Toys (12-Pack Multi-Color LED Finger Straps)
Model: CADE-FL-100
Item Subtotal: $14.99
Shipping: FREE Prime Delivery
Standard 30-day Amazon return period
            """,
            "format": "text",
            "metadata": {
                "name": "Cade Electronic Finger Light Toys (12-Pack)",
                "merchant": "Amazon",
                "price": 14.99,
                "currency": "USD",
                "purchase_date": now - timedelta(days=14),
                "category": "Toys & Kids",
                "model_number": "CADE-FL-100",
                "return_window_days": 30,
                "warranty_days": 90,
                "expected_outcome": "🚨 RECALL ESCALATION (CPSC Recall #24-001: Button Battery Ingestion Hazard)"
            }
        },
        {
            "raw_text": """
TARGET STORE #1822
Transaction: #9048123
Date: {(now - timedelta(days=28)).strftime('%Y-%m-%d')}
Item: Logitech MX Master 3S Advanced Wireless Mouse (Graphite)
UPC: 097855172280
Price: $99.99
Payment: Debit Card (MC 9011)
Target Return Policy: 30 days return window with receipt. Ends in 48 hours!
            """,
            "format": "text",
            "metadata": {
                "name": "Logitech MX Master 3S Wireless Mouse",
                "merchant": "Target",
                "price": 99.99,
                "currency": "USD",
                "purchase_date": now - timedelta(days=28),
                "category": "Electronics",
                "model_number": "910-006556",
                "return_window_days": 30,
                "warranty_days": 365,
                "expected_outcome": "⏰ DEADLINE ESCALATION (Return window closing in 2 days!)"
            }
        }
    ]
