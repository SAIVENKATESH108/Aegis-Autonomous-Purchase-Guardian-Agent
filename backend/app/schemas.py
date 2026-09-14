"""
Pydantic Schemas for Aegis API request and response serialization.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


class ReceiptInput(BaseModel):
    """Payload for submitting a purchase receipt."""
    raw_text: Optional[str] = Field(None, description="Plain text receipt or email paste")
    json_data: Optional[Dict[str, Any]] = Field(None, description="Structured JSON receipt data")
    format: str = Field("text", description="Input type: 'text' or 'json'")


class ParsedReceipt(BaseModel):
    """Standardized output from ReceiptParserFactory and IngestionAgent."""
    name: str
    merchant: str
    price: float
    currency: str = "USD"
    purchase_date: datetime
    category: str = "General"
    model_number: Optional[str] = None
    return_window_days: int = 30
    warranty_days: int = 365
    confidence_score: float = 1.0


class EscalationBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    severity: str
    status: str
    reason: str
    created_at: datetime


class ItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    merchant: str
    price: float
    currency: str
    purchase_date: datetime
    category: str
    model_number: Optional[str] = None
    return_window_days: int
    return_deadline: datetime
    warranty_days: int
    warranty_deadline: datetime
    status: str
    created_at: datetime
    
    # Computed metrics
    days_left_return: int = 0
    days_left_warranty: int = 0
    is_return_closing_soon: bool = False
    has_active_recall: bool = False
    escalations: List[EscalationBrief] = []


class EscalationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    item_id: str
    item_name: Optional[str] = None
    merchant: Optional[str] = None
    price: Optional[float] = None
    type: str
    severity: str
    reason: str
    draft_action: str
    draft_recipient: Optional[str] = None
    status: str
    cpsc_recall_id: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class ActionApprovalRequest(BaseModel):
    notes: Optional[str] = None


class SystemStats(BaseModel):
    total_items_monitored: int
    active_alerts_count: int
    recalls_detected_count: int
    total_protected_value: float
    nearest_deadline_item: Optional[str] = None
    nearest_deadline_date: Optional[datetime] = None
    bedrock_status: Dict[str, Any]
