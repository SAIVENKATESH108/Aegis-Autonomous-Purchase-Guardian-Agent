"""
DraftAgent for Aegis Guardian.

Generates pre-filled, professional action drafts (return request emails, CPSC recall claims,
warranty replacement notices) via Amazon Bedrock (using the Strands Agents SDK)
with a deterministic fallback generator when AWS Bedrock credentials are unconfigured.
"""

from typing import Dict, Any, Optional
import logging
from app.config import bedrock_singleton, settings

logger = logging.getLogger("aegis.draft_agent")


class DraftAgent:
    """
    Strands Agent for crafting ready-to-approve consumer defense communications.
    """
    def __init__(self):
        self.bedrock_config = bedrock_singleton

    def generate_return_draft(
        self,
        item_name: str,
        merchant: str,
        price: float,
        purchase_date_str: str,
        days_left: int
    ) -> str:
        """Drafts a merchant return request email/message."""
        prompt = (
            f"Generate a professional, concise return request email to {merchant} customer support for "
            f"'{item_name}' purchased on {purchase_date_str} for ${price:.2f}. "
            f"Note that the return window closes in {days_left} day(s). Request a prepaid return shipping label or RMA."
        )

        llm_text = self._call_llm_if_available(prompt)
        if llm_text:
            return llm_text

        # High-fidelity fallback draft
        return f"""Subject: Return Request & RMA / Prepaid Label for Order: {item_name}

Dear {merchant} Customer Support Team,

I am writing regarding my purchase of the "{item_name}" (${price:.2f}), purchased on {purchase_date_str}.

According to your standard return policy, my return eligibility window will expire in {days_left} day(s). I would like to initiate a return and request a full refund to my original method of payment.

Please provide:
1. An official Return Merchandise Authorization (RMA) number.
2. A prepaid return shipping label and instructions for package drop-off.

Thank you for your prompt assistance in processing this return before the deadline.

Sincerely,
Verified Purchaser
(Aegis Guardian Reference: RET-{item_name[:6].upper().replace(' ', '')})"""

    def generate_recall_draft(
        self,
        item_name: str,
        merchant: str,
        cpsc_recall_id: str,
        recall_title: str,
        hazard: str,
        remedy: str,
        consumer_contact: Optional[str] = None
    ) -> str:
        """Drafts an official recall claim / refund application for manufacturer/retailer."""
        prompt = (
            f"Draft an official consumer safety recall claim message to the manufacturer/retailer ({merchant}) "
            f"regarding '{item_name}'. It has been recalled under CPSC Recall #{cpsc_recall_id} due to '{hazard}'. "
            f"Remedy sought: '{remedy}'. Request instructions to receive the full refund or replacement kit."
        )

        llm_text = self._call_llm_if_available(prompt)
        if llm_text:
            return llm_text

        contact_info = consumer_contact or f"{merchant} Product Safety & Recall Division"

        # High-fidelity fallback draft
        return f"""Subject: URGENT: Consumer Safety Recall Claim — CPSC Recall #{cpsc_recall_id} ({item_name})

Attention: {contact_info}

RE: Official Recall Remedy Application for {item_name}
CPSC Announcement: {recall_title}
Official Recall ID: #{cpsc_recall_id}
Identified Hazard: {hazard}

Dear Product Safety & Customer Care Team,

I am submitting this urgent claim as the owner of the recalled "{item_name}", purchased via {merchant}. 

In accordance with the official United States Consumer Product Safety Commission (CPSC) recall announcement regarding the identified safety hazard ({hazard}), I am requesting the approved remedy: {remedy}.

Please immediately provide:
1. Instructions on whether to return or safely dispose of the recalled unit.
2. The claim reference number and prepaid return mailer (if physical return is required).
3. Timetable for dispatch of the official refund or replacement remedy.

I have stopped using this product immediately to avoid safety risks.

Thank you for prioritizing consumer safety.

Sincerely,
Verified Consumer
(Dispatched via Aegis Autonomous Purchase Guardian)"""

    def generate_credit_card_claim(
        self,
        item_name: str,
        merchant: str,
        price: float,
        purchase_date_str: str,
        reason: str
    ) -> str:
        """Drafts a 90-Day Credit Card Purchase Protection & Extended Warranty Benefit Claim."""
        prompt = (
            f"Generate an official Credit Card Purchase Protection Benefit Claim to the cardholder benefits administrator "
            f"for '{item_name}' purchased on {purchase_date_str} at {merchant} for ${price:.2f}. Issue: {reason}. Request statement credit."
        )

        llm_text = self._call_llm_if_available(prompt)
        if llm_text:
            return llm_text

        return f"""Subject: Cardholder Benefit Claim: Purchase Protection Reimbursement — {item_name}

To: Cardholder Benefits Administration & Claims Department
RE: Automatic Purchase Protection & Extended Warranty Coverage
Item: {item_name}
Merchant: {merchant}
Purchase Date: {purchase_date_str}
Total Covered Amount: ${price:.2f} USD

Dear Claims Administrator,

I am filing a formal claim under my cardholder Purchase Protection and Extended Warranty benefit terms regarding the purchase of "{item_name}" for ${price:.2f} on {purchase_date_str}.

Basis for Claim:
{reason}

As a covered benefit of my card agreement, eligible purchases are insured against product defects, unresolvable merchant disputes, and safety hazard recalls within the covered period.

Please open claim file ref AEGIS-CC-{item_name[:5].upper()} and issue the purchase protection reimbursement of ${price:.2f} to my account.

Sincerely,
Verified Cardholder
(Filed via Aegis Autonomous Purchase Guardian)"""

    def _call_llm_if_available(self, prompt: str) -> Optional[str]:
        """Calls Strands Agent with BedrockModel if AWS credentials are active."""
        if not self.bedrock_config.is_live_bedrock:
            return None

        try:
            from strands import Agent
            agent = Agent(
                model=self.bedrock_config.model,
                system_prompt="You are Aegis DraftAgent, an autonomous consumer protection AI. You generate polite, firm, perfectly formatted letters and emails for returns, warranty claims, and product safety recalls. Output only the message body and subject."
            )
            result = agent(prompt)
            text = ""
            if hasattr(result, "message") and isinstance(result.message, dict) and "content" in result.message:
                content = result.message["content"]
                if isinstance(content, list) and len(content) > 0 and isinstance(content[0], dict):
                    text = content[0].get("text", "")
            if not text:
                text = str(result)
            if text and text.strip():
                return text.strip()
        except Exception as e:
            logger.warning(f"[DraftAgent Bedrock Notice] {e}. Utilizing high-fidelity autonomous template.")
        return None


draft_agent = DraftAgent()
