# Aegis — Autonomous Purchase Guardian Agent 🛡️

> Built for the AI Agent Hackathon using the **Strands Agents SDK (Python)**, **Amazon Bedrock**, **FastAPI**, **SQLAlchemy ORM (SQLite)**, and a **React + Vite + TypeScript** frontend with **Tailwind CSS**, **TanStack Query**, and **Zustand**.

---

## The Problem Aegis Solves

Modern consumers constantly leak money and endanger their families due to information asymmetry:
1. **Missed Return Windows**: Millions of dollars in eligible refunds evaporate because return-window deadlines expire silently without notice.
2. **Expired Warranties**: Products fail shortly after manufacturer coverage ends, when claims could have been filed before expiration.
3. **Hazardous Safety Recalls**: The U.S. Consumer Product Safety Commission (CPSC) announces thousands of urgent product recalls (e.g. fire hazards, choking hazards, toxic battery ingestion), but consumers rarely check federal recall databases and continue using dangerous products.

### The Aegis Principle: Silent Tracking vs. Actionable Escalation
Traditional apps flood users with endless daily notifications, causing alert fatigue. **Aegis is strictly autonomous:**
- **Routine items stay 100% silent**: If an item is within safe return windows and has zero safety recalls, Aegis monitors it in the background without disturbing the user.
- **Escalate ONLY when human decision is required**: When a return window is closing soon (≤ 5 days) OR a tracked item matches an official CPSC safety recall, Aegis immediately surfaces an actionable escalation with a **pre-drafted claim message ready for 1-click approval**.

---

## Architecture & Code Design Patterns

Aegis explicitly implements production-grade design patterns with full architectural justification:

### 1. Agents (Strands Agents SDK)
- **`IngestionAgent`** (`backend/app/agents/ingestion_agent.py`): Ingests unstructured receipt text or JSON e-commerce payloads and extracts item name, merchant, price, purchase date, return window days, and warranty period. Refines via Amazon Bedrock when connected.
- **`TriageAgent`** (`backend/app/agents/triage_agent.py`): Orchestrates pluggable triage rules using the **Strategy Pattern** to decide whether an item warrants an escalation.
- **`RecallCheckAgent`** (`backend/app/agents/recall_agent.py`): Cross-references tracked products against the **CPSC Recalls API** (`https://www.saferproducts.gov/RestWebServices/Recall`) with LRU caching.
- **`DraftAgent`** (`backend/app/agents/draft_agent.py`): Leverages Amazon Bedrock (via Strands) to pre-fill ready-to-send return authorization requests or CPSC manufacturer recall remedy claims.

### 2. Design Patterns
- **Factory Pattern (`ReceiptParserFactory`)**: `backend/app/agents/receipt_factory.py`
  - *Justification*: Dispatches unstructured plaintext, email receipts, or structured JSON to dedicated parsers (`TextReceiptParser`, `JsonReceiptParser`) without exposing parsing internals.
- **Repository Pattern (`ItemRepository`)**: `backend/app/repository.py`
  - *Justification*: Wraps all SQLite ORM operations. Zero raw SQL or database queries exist outside this class, guaranteeing separation of concerns and atomic synchronization with the Min-Heap.
- **Observer Pattern (`EscalationPublisher`)**: `backend/app/publisher.py`
  - *Justification*: Decouples escalation generation from delivery channels. Notifies `InAppFeedNotifier` and a stubbed `TelegramNotifier`.
- **Singleton Pattern (`DatabaseSingleton` & `BedrockConfigSingleton`)**: `backend/app/config.py`
  - *Justification*: Thread-safe shared SQLite engine prevents file locking, while shared Bedrock configuration manages AWS credentials and fallback state gracefully.

### 3. Core Data Structures
- **Min-Heap (`DeadlineHeap` via Python `heapq`)**: `backend/app/data_structures.py`
  - *Justification*: In-memory priority queue keyed by nearest deadline timestamp (`min(return_deadline, warranty_deadline)`). Provides $O(\log n)$ push/pop and $O(1)$ peek to deliver priority-sorted dashboards without full database scans.
- **LRU Cache (`LRUProductCache`)**: `backend/app/data_structures.py`
  - *Justification*: Caches CPSC recall query responses per product name and model to avoid redundant network round-trips to the federal API.

---

## 3 Seed Demonstration Samples

Aegis includes 1-click seed receipts demonstrating the silent vs. escalate contrast:

1. **Routine Item 1: Anker 65W Fast Wall Charger** ($39.99, purchased 10 days ago, 30-day return policy).
   - *Behavior*: **Silent Monitoring**. 20 days remaining, CPSC clean. No user alerts.
2. **Routine Item 2: Nike Air Zoom Pegasus Shoes** ($129.99, purchased 8 days ago, 60-day return policy).
   - *Behavior*: **Silent Monitoring**. 52 days remaining, CPSC clean. No user alerts.
3. **Safety Recall Item 3: Cade Electronic Finger Light Toys** ($14.99).
   - *Behavior*: **🚨 Urgent Recall Escalation**. Matches CPSC Recall #24-001 (Button battery ingestion hazard). DraftAgent immediately prepares an official recall remedy claim for 1-click approval.
4. **Closing Deadline Item 4: Logitech MX Master 3S Mouse** ($99.99, purchased 28 days ago, 30-day return window).
   - *Behavior*: **⏰ Urgent Return Window Escalation**. Only 2 days remaining. DraftAgent pre-fills an RMA & prepaid return label request email for 1-click approval.

---

## Project Structure

```
HackforHumantity/
├── backend/
│   ├── app/
│   │   ├── config.py              # Singletons (DB & Bedrock) & Settings
│   │   ├── models.py              # SQLAlchemy Item & Escalation models
│   │   ├── schemas.py             # Pydantic v2 validation models
│   │   ├── data_structures.py     # Min-Heap (heapq) & LRU Cache
│   │   ├── repository.py          # ItemRepository (Repository Pattern)
│   │   ├── publisher.py           # EscalationPublisher (Observer Pattern)
│   │   ├── services/
│   │   │   ├── cpsc_client.py     # CPSC API client + LRU caching
│   │   │   └── seed_data.py       # 4 sample receipts
│   │   ├── agents/
│   │   │   ├── receipt_factory.py # ReceiptParserFactory (Factory Pattern)
│   │   │   ├── ingestion_agent.py # Strands IngestionAgent
│   │   │   ├── triage_agent.py    # Strategy Pattern (Return, Warranty, Recall rules)
│   │   │   ├── recall_agent.py    # RecallCheckAgent
│   │   │   └── draft_agent.py     # DraftAgent (Bedrock LLM action drafting)
│   │   └── main.py                # FastAPI endpoints & CORS
│   ├── tests/
│   │   └── test_backend.py        # Automated test suite (5 passed)
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── index.html                 # SEO & Open Graph tags
│   ├── src/
│   │   ├── types/index.ts         # TypeScript definitions
│   │   ├── store/useGuardianStore.ts # Zustand state management
│   │   ├── api/client.ts          # TanStack Query hooks (30s polling)
│   │   └── components/
│   │       ├── Navbar.tsx         # Brand 🛡️ & Bedrock status
│   │       ├── StatsBar.tsx       # Live guardian metrics
│   │       ├── DemoBanner.tsx     # 1-click sample seed & reset
│   │       ├── Dashboard.tsx      # Min-Heap priority purchase cards
│   │       ├── AlertFeed.tsx      # Escalations & 1-click approvals
│   │       ├── AddItemModal.tsx   # Receipt text/JSON input & presets
│   │       ├── ItemDetailModal.tsx# Purchase audit & CPSC certificate
│   │       └── ToastContainer.tsx # In-app alert notifications
│   └── tailwind.config.js         # #FAFAF8 canvas, navy/emerald accents
└── README.md
```

---

## Quickstart Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node 24)

### 1. Start the Backend API

```bash
cd backend
pip install -r requirements.txt
python run.py
```
*Backend API will run at `http://localhost:8000` (Interactive Swagger docs at `http://localhost:8000/docs`).*

*(Optional Amazon Bedrock setup)*:
Create a `.env` file in `backend/`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```
*Note: If AWS credentials are omitted, Aegis runs seamlessly in autonomous local heuristic mode with identical schemas, ensuring 100% reliable evaluation without AWS dependency.*

### 2. Run Backend Unit Tests

```bash
$env:PYTHONPATH="backend"; python -m pytest backend/tests/test_backend.py -v
```

### 3. Start the Frontend Application

```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## Verifying the MVP User Flow

1. Open the dashboard at `http://localhost:5173`.
2. Click **"🚀 1-Click Demo Seed"** in the top banner.
3. Observe:
   - **Routine items** (Anker Charger & Nike Shoes) display `✅ Silent & Clear`.
   - **Closing Return Window** (Logitech Mouse) displays `⏰ Closing Soon`.
   - **Recalled Item** (Cade Toys) highlights in red `🚨 Recall Match`.
4. Navigate to the **"🚨 Escalations"** tab.
5. Review the pre-drafted claim prepared by DraftAgent with the official CPSC recall identifier.
6. Click **"✅ 1-Click Approve & Dispatch"**:
   - The status updates immediately to `Approved`.
   - An in-app toast confirms that the observer notification has been dispatched.
7. Click **"Track Receipt"** in the navigation bar to test your own custom receipt text or structured JSON.
