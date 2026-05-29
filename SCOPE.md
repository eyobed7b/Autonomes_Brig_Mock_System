# Autonomes Brig — Project Scope & Architecture

**Intelligent Operations & Business Assurance Bridge for Safaricom Ethiopia**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Project Scope](#3-project-scope)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Component Architecture](#5-component-architecture)
   - [Frontend (React + Vite)](#a-frontend-react--vite)
   - [Backend API (Node.js + Express)](#b-backend-api-nodejs--express)
   - [Mock Multi-Agent Engine (MCP)](#c-mock-multi-agent-engine-mcp)
   - [Data Layer (In-Memory DB)](#d-data-layer-in-memory-db)
6. [Multi-Agent System Design](#6-multi-agent-system-design)
7. [Data Flow & Scenarios](#7-data-flow--scenarios)
8. [API Contracts](#8-api-contracts)
9. [Frontend Dashboard Design](#9-frontend-dashboard-design)
10. [Technology Stack](#10-technology-stack)
11. [Folder Structure](#11-folder-structure)
12. [Production Architecture Vision](#12-production-architecture-vision)
13. [Roadmap](#13-roadmap)

---

## 1. Executive Summary

**Autonomes Brig** is an **Intelligent Operations & Business Assurance Bridge** that correlates Safaricom Ethiopia's GSM infrastructure health, M-Pesa financial transaction flows, and bank API connectivity into a single unified intelligence platform. It provides two distinct audience-specific views — one for **business stakeholders** focused on revenue impact, and one for **technical teams** focused on root-cause diagnostics.

The current implementation is a **fully functional Proof of Concept (PoC)** built with a lightweight mock stack that simulates a live telecom environment in real time, demonstrating the full end-to-end value of the architecture without requiring production infrastructure.

---

## 2. Problem Statement

Safaricom Ethiopia operates a large GSM network spanning all Ethiopian regions. When a cell tower degrades or goes offline, the impact cascades into M-Pesa transaction failures — directly translating to revenue loss and merchant disruption. The core challenges addressed by this system are:

| Challenge | Description |
|-----------|-------------|
| **Siloed Visibility** | Network Operations (NOC) and Finance/Business teams see completely different data in different tools with no correlation layer |
| **Slow Root Cause Identification** | Engineers spend hours manually correlating transaction failure logs with site health reports |
| **No Financial Impact Quantification** | Tech teams receive alarms but cannot quantify the business cost of each incident in real time |
| **Bank API Blind Spots** | M-Pesa failures caused by upstream bank gateway issues are indistinguishable from radio network failures without a combined view |
| **No Actionable AI Layer** | Raw metrics are available but no intelligent layer translates them into prioritized, role-specific recommended actions |

---

## 3. Project Scope

### In Scope (Current PoC)

- ✅ **Dual-view dashboard** — Business (Google Maps) and Technology (analytics panels) personas
- ✅ **15 tower sites** across all Ethiopian administrative regions with live health simulation
- ✅ **8 Ethiopian bank API** integrations (CBE, Coop, Awash, Dashen, Abyssinia, Wegagen, Berhan, Bunna)
- ✅ **Real-time WebSocket feed** pushing live metrics every 5 seconds
- ✅ **Mock Multi-Agent Engine** (MCP pattern) with Business Agent, Tech Agent, and Orchestrator
- ✅ **AI Chatbot** with natural language interface backed by live data
- ✅ **5-tier regional health coloring** on interactive Google Maps
- ✅ **Technology analytics panels** — bank TX success, API health, service health, regional availability
- ✅ **Incident alert descriptions** per panel when metrics breach SLA thresholds
- ✅ **Background simulator** generating realistic metric fluctuations every 5 seconds

### Out of Scope (Current PoC — Production Extensions)

- ❌ Apache Kafka ingestion from live G2 Core / NOC feeds
- ❌ Apache Flink / Spark Streaming for time-windowed event joins
- ❌ Apache Iceberg / Delta Lake data lakehouse
- ❌ Real LLM-backed agents (LangGraph / CrewAI)
- ❌ Authentication and role-based access control (RBAC)
- ❌ Multi-tenancy or organization scoping
- ❌ Production Kubernetes / OpenShift deployment

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              FRONT-END (React + Vite, Port 5173)               │
│  ┌────────────────────────────┐  ┌────────────────────────────┐ │
│  │   Business Dashboard        │  │   Technology Dashboard     │ │
│  │   Google Maps + Regions     │  │   4-Panel Analytics Grid   │ │
│  │   5-Tier Health Coloring    │  │   Bank TX / API / Service  │ │
│  │   15 Tower Markers          │  │   Regional Availability    │ │
│  │   M-Pesa & GSM Sidebars     │  │   Incident Alert Boxes     │ │
│  └────────────────────────────┘  └────────────────────────────┘ │
│                     AI Chatbot (bottom-right, both views)        │
└──────────────────────────────▲─────────────────────────────────┘
                               │  REST + WebSocket
                               ▼
┌────────────────────────────────────────────────────────────────┐
│              BACK-END (Node.js + Express, Port 4000)            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  REST Routes: /api/dashboard/*, /api/towers, /api/chat   │   │
│  │  WebSocket Server: Broadcasts full state every 5s        │   │
│  └─────────────────────────────┬────────────────────────────┘   │
│                                │                                 │
│  ┌─────────────────────────────▼────────────────────────────┐   │
│  │  Mock Multi-Agent Engine (MCP Coordinator)                │   │
│  │  ├── BusinessAgent  → revenue risk, business summaries    │   │
│  │  ├── TechAgent      → root cause, recommended actions     │   │
│  │  └── Orchestrator   → runs agent cycle every 5s           │   │
│  └─────────────────────────────┬────────────────────────────┘   │
│                                │                                 │
│  ┌─────────────────────────────▼────────────────────────────┐   │
│  │  Background Simulator (setInterval, 5s)                   │   │
│  │  ├── mutateTowerMetrics()  — GSM KPI drift                │   │
│  │  ├── generateMpesaTransactions() — failed/success TX      │   │
│  │  └── mutateBankMetrics()  — bank latency/status drift     │   │
│  └─────────────────────────────┬────────────────────────────┘   │
│                                │                                 │
│  ┌─────────────────────────────▼────────────────────────────┐   │
│  │  In-Memory Data Store (data.js + db.js)                   │   │
│  │  towers[] · mpesaTransactions[] · banks[] · insights{}    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Architecture

### A. Frontend (React + Vite)

The frontend is a single-page React application with no routing — state-driven view switching between Business and Technology personas.

#### Key State

| State Variable | Type | Purpose |
|---|---|---|
| `view` | `'Business' \| 'Technology'` | Active dashboard persona |
| `towers` | `Tower[]` | Live tower data from WebSocket |
| `banks` | `Bank[]` | Live bank API data from WebSocket |
| `overview` | `Overview` | Global KPI summary from WebSocket |
| `chatOpen` | `boolean` | Chatbot panel visibility toggle |
| `chatMessages` | `Message[]` | Conversation history with the AI assistant |

#### Business Dashboard Components

- **Google Map** (`@react-google-maps/api`) — full-screen background map
- **PolygonF** per Ethiopian region — filled with 5-tier health color based on combined GSM + M-Pesa score
- **MarkerF** per tower — colored pin per tower health tier
- **InfoWindowF** — detailed tower popup on marker click
- **Map Legend** — 5-tier color key (Excellent → Critical)
- **GSM Sidebar (left)** — voice, data, throughput per tower
- **M-Pesa Sidebar (right)** — transaction count, success rate, failed ETB per tower

#### Technology Dashboard Components

- **SVG Grid Background** — animated technical aesthetic
- **4-Panel Analytics Grid** (2×2):
  1. **Bank TX Success Rate** — horizontal bar chart per bank
  2. **API Health & Connectivity** — table with status, latency, incident count
  3. **Service Health** — voice/data/SMS progress bars with SLA status
  4. **Regional Availability** — per-region GSM availability with incident counts
- **Incident Alert Boxes** — conditional alerts beneath each panel when SLA is breached

#### Shared Components (Both Views)

- **Header** — logo, title, Business/Technology toggle buttons
- **5-KPI Bar** — Revenue At Risk · M-Pesa Success · Active Users · GSM Availability · Avg Throughput
- **Chatbot FAB** — floating 💬 button bottom-right, toggles chat panel

#### Health Tier System

| Tier | Score | Color | Label |
|------|-------|-------|-------|
| Excellent | ≥ 90% | `#22c55e` (green) | Excellent (>90%) |
| Good | 75–90% | `#06b6d4` (cyan) | Good (75–90%) |
| Warning | 60–75% | `#f59e0b` (amber) | Warning (60–75%) |
| Degraded | 45–60% | `#f97316` (orange) | Degraded (45–60%) |
| Critical | < 45% | `#ef4444` (red) | Critical (<45%) |

Score is the average of `currentAvailability` and `mpesaSuccessRate` for the towers in that region.

---

### B. Backend API (Node.js + Express)

The backend is a single Node.js process serving REST endpoints and a WebSocket server.

#### Entry Point — `src/index.js`

- Initializes in-memory data store
- Starts background simulator (5s interval)
- Starts MCP orchestrator (5s interval)
- Creates HTTP server, attaches WebSocket
- Mounts REST routes

#### REST Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Uptime check |
| `GET` | `/api/dashboard/overview` | Global KPIs |
| `GET` | `/api/dashboard/towers` | All towers with agent insights |
| `POST` | `/api/chat` | Natural language chatbot endpoint |

#### WebSocket — `src/websocket.js`

On connection, broadcasts an `init` message. Every 5 seconds broadcasts an `update` message. Both carry:

```json
{
  "type": "init | update",
  "overview": { ... },
  "towers": [ ... ],
  "banks": [ ... ]
}
```

---

### C. Mock Multi-Agent Engine (MCP)

The agent engine implements a **Model Context Protocol (MCP)**-inspired message-passing architecture using pure JavaScript deterministic rules — no external LLM required for the PoC.

#### `MCPMessage`

Represents a single message in the agent pipeline:

```js
{ id, source, type, payload, timestamp }
```

#### `MCPContext`

Holds the shared state for one evaluation cycle on a single tower:

```js
{ tower, failures, mpesaSummary, tools, messages[], sharedState{} }
```

#### `MCPCoordinator`

- Registers agents
- For each evaluation, creates an `MCPContext`, broadcasts a `request` message, calls each agent's `process(context)` method, broadcasts the `response`

#### Agent Decision Flow

```
Every 5 seconds → Orchestrator.evaluateTower(tower)
                        │
             Fetch recent failed transactions
                        │
          Is availability < 95% OR failureCount > 10?
                   │                    │
                  YES                   NO
                   │                    │
        ┌──────────┴──────────┐   Clear agent insights
        ▼                     ▼
  BusinessAgent          TechAgent
  ─────────────          ─────────
  • Sum failed TX         • Check availability %
  • Calculate % drop      • If avail < 50% → CRITICAL
  • Build business        • If avail OK but TX fail
    summary text            → Bank/G2 issue (MEDIUM)
  • Set revenue_at_risk   • Build root cause text
        │                     │
        └──────────┬──────────┘
                   ▼
        Upsert to agentInsights{}
        { severity, revenueAtRisk, businessSummary,
          technicalRootCause, recommendedAction }
```

---

### D. Data Layer (In-Memory DB)

All data lives in JavaScript objects in memory — seeded at startup and mutated by the simulator.

#### `towers[]` — 15 sites across Ethiopia

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `TWR-001` … `TWR-015` |
| `name` | string | Site name (e.g., "Bole District Tower") |
| `region` | string | Ethiopian region |
| `lat` / `lng` | number | Geographic coordinates |
| `currentAvailability` | number | GSM uptime % (0–100) |
| `voiceSuccessRate` | number | Voice call success % |
| `dataSuccessRate` | number | Data session success % |
| `smsSuccessRate` | number | SMS delivery success % |
| `dataThroughputMbps` | number | Current throughput |
| `mpesaSuccessRate` | number | M-Pesa TX success % |
| `mpesaTransactionCount` | number | Recent TX count |
| `mpesaFailedAmount` | number | Failed ETB amount |
| `activeUsers` | number | Current connected users |
| `agentInsight` | object | Latest MCP agent output |

#### `banks[]` — 8 Ethiopian banks

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Bank identifier |
| `name` / `fullName` | string | Short and full name |
| `successRate` | number | TX success % |
| `apiLatencyMs` | number | Gateway response time |
| `connected` | boolean | API reachability |
| `incidents` | number | Active incident count |

#### Tower Coverage by Region

| Region | Sites |
|--------|-------|
| Addis Ababa | Bole District Tower, Merkato Tower |
| Amhara | Bahir Dar Tower, Gondar Tower, Dessie Tower |
| SNNPR | Hawassa Tower, Sodo Tower |
| Oromia | Jimma Tower, Adama Tower |
| Tigray | Mekelle Tower |
| Dire Dawa | Dire Dawa Tower |
| Harari | Harar Tower |
| Benishangul-Gumuz | Assosa Tower |
| Gambela | Gambela Tower |
| Somali | Jijiga Tower |

---

## 6. Multi-Agent System Design

The MCP (Model Context Protocol) design separates concerns between two specialized agents coordinated by an orchestrator — mirroring how a production LangGraph or CrewAI system would route queries.

```
┌─────────────────────────────────────────────────────┐
│               MCPCoordinator                         │
│  • Maintains agent registry                          │
│  • Creates MCPContext per evaluation                 │
│  • Emits request → processes → emits response        │
└───────────────┬─────────────────────────────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
┌──────────────┐    ┌──────────────────────┐
│ BusinessAgent│    │ TechAgent            │
├──────────────┤    ├──────────────────────┤
│ Inputs:      │    │ Inputs:              │
│ • Tower data │    │ • Tower availability │
│ • Failed TXs │    │ • Failure count      │
│ • Revenue    │    │ • TX error patterns  │
│              │    │                      │
│ Outputs:     │    │ Outputs:             │
│ • businessSummary │ • technicalRootCause│
│ • revenueAtRisk   │ • recommendedAction  │
│ • severity   │    │ • severity           │
└──────────────┘    └──────────────────────┘
```

### BusinessAgent Logic

- Sums `mpesaFailedAmount` across recent failed transactions
- Calculates `revenueAtRisk` as `failedAmount × frequency multiplier`
- Generates natural language `businessSummary` describing financial impact
- Sets severity: `HIGH` if revenue > threshold, `MEDIUM` or `LOW` otherwise

### TechAgent Logic

- Evaluates `currentAvailability` against thresholds
- **CRITICAL path**: availability < 50% → hardware/backhaul issue, field dispatch needed
- **MEDIUM path**: availability healthy but TX failing → bank gateway / G2 Core timeout
- Generates `technicalRootCause` and `recommendedAction` text
- Severity mapping: `CRITICAL` / `MEDIUM` / `LOW`

### /api/chat — NLP Layer

The chat endpoint provides a natural language interface over the same live data:

| Query Intent | Trigger Pattern | Data Source |
|---|---|---|
| Greeting | `hello\|hi\|help` | Static welcome |
| Alerts | `critical\|alerts?\|incident` | `agentInsights` |
| Banks | `bank\|api\|gateway\|latency` | `banks[]` |
| M-Pesa | `mpesa\|payment\|revenue` | `overview + towers` |
| Service health | `voice\|data\|sms\|gsm` | `towers` KPIs |
| Availability | `availab\|network\|status` | `overview` |
| Worst sites | `worst\|problem\|degrad` | `towers` sorted |
| Regional | `region\|area\|map` | `towers` grouped |
| Recommendations | `recommend\|action\|fix` | `agentInsights` |
| Active users | `users?\|active\|people` | `overview + towers` |
| Full summary | `summary\|overview\|report` | All sources |

---

## 7. Data Flow & Scenarios

### Scenario A: GSM Site Degradation → Business Impact

```
1. Simulator: mutateTowerMetrics()
   └─ Drops Tower TWR-006 (Mekelle) availability to 42%

2. Simulator: generateMpesaTransactions()
   └─ Inserts 15 failed transactions tagged to TWR-006

3. Orchestrator (5s cycle): evaluateTower(TWR-006)
   ├─ availability < 95% → anomaly detected
   ├─ BusinessAgent → "Revenue at risk: ETB 8,400. Transaction drop-off at Mekelle Tower."
   └─ TechAgent → "CRITICAL: availability 42%. Dispatch field engineer. Check power/backhaul."

4. WebSocket broadcast → Frontend receives updated towers[]

5. Business View:
   └─ Tigray region polygon turns RED on the map
   └─ KPI card: Revenue At Risk updates
   └─ Mekelle sidebar card shows failure stats

6. Tech View:
   └─ Regional Availability panel: Tigray shows 🔴 incident badge
   └─ Panel alert box: "🔴 Active incidents in: Tigray (1 site below 80%)"

7. Chatbot:
   └─ User: "what are the current alerts?"
   └─ Reply: "⚠️ 1 critical incident detected: Mekelle Tower — CRITICAL availability 42%. Dispatch recommended."
```

### Scenario B: Bank API Failure → M-Pesa Impact

```
1. Simulator: mutateBankMetrics()
   └─ Berhan Bank: connected=false, incidents=2

2. WebSocket broadcast → Frontend receives updated banks[]

3. Tech View — Panel 2 (API Health):
   └─ Berhan row shows "● Offline" badge in red
   └─ Panel alert: "🔴 Berhan offline. High latency: Wegagen (412ms)."

4. TechAgent detects TX failures with healthy tower availability:
   └─ "Fintech Gateway Alert: Tower availability healthy. Issue isolated to Berhan Bank API timeouts."

5. Chatbot:
   └─ User: "show me bank status"
   └─ Reply: "🔴 Offline: Berhan · ⚠️ High latency: Wegagen (412ms) · Full status table..."
```

---

## 8. API Contracts

### `GET /api/dashboard/overview`

```json
{
  "towerCount": 15,
  "totalRevenueAtRisk": 14250.00,
  "globalNetworkAvailability": 94.2,
  "activeCriticalAlarms": 3,
  "mpesaSuccessRate": 96.4,
  "avgDataThroughputMbps": 87.3,
  "totalActiveUsers": 124800
}
```

### `GET /api/dashboard/towers`

```json
[
  {
    "id": "TWR-001",
    "name": "Bole District Tower",
    "region": "Addis Ababa",
    "lat": 9.0222,
    "lng": 38.7468,
    "currentAvailability": 42.5,
    "voiceSuccessRate": 88.1,
    "dataSuccessRate": 85.3,
    "smsSuccessRate": 91.2,
    "dataThroughputMbps": 72.4,
    "mpesaSuccessRate": 78.2,
    "mpesaTransactionCount": 340,
    "mpesaFailedAmount": 4800.00,
    "activeUsers": 12400,
    "agentInsight": {
      "severity": "CRITICAL",
      "revenueAtRisk": 4800.00,
      "businessSummary": "Tower Bole District Tower is showing high transaction drop-offs...",
      "technicalRootCause": "Hardware Alert: availability dropped to 42.5%. Field dispatch recommended...",
      "recommendedAction": "Inspect power supply and backhaul microwave link alignment."
    }
  }
]
```

### `POST /api/chat`

**Request:**
```json
{ "message": "which region has the lowest availability?" }
```

**Response:**
```json
{
  "reply": "🗺️ Regional Availability (10 regions):\n\n🔴 Tigray: 42.5% (1 site)\n🟡 Gambela: 73.2% (1 site)\n..."
}
```

### WebSocket Message

```json
{
  "type": "init | update",
  "overview": { ... },
  "towers": [ ... ],
  "banks": [
    {
      "id": "CBE",
      "name": "CBE",
      "fullName": "Commercial Bank of Ethiopia",
      "successRate": 98.2,
      "apiLatencyMs": 123,
      "connected": true,
      "incidents": 0
    }
  ]
}
```

---

## 9. Frontend Dashboard Design

### Business View Layout

```
┌──────────────────── HEADER ──────────────────────────┐
│  📱 Safaricom   Business Operations   [Biz] [Tech]   │
└──────────────────────────────────────────────────────┘
┌─────────── 5-KPI SHARED BAR ─────────────────────────┐
│  Revenue At Risk │ M-Pesa Success │ Active Users │ ...│
└──────────────────────────────────────────────────────┘
┌──── GSM Sidebar ───┐  ┌── GOOGLE MAP (full bg) ──┐  ┌── M-Pesa Sidebar ──┐
│ Per-tower:         │  │ Region polygons (5-tier) │  │ Per-tower:         │
│ Voice / Data / Mbps│  │ Tower markers            │  │ TX Count / Success │
│ Active users       │  │ InfoWindow on click      │  │ Failed ETB         │
└────────────────────┘  │ Health legend (bottom-L) │  └────────────────────┘
                        └──────────────────────────┘
                              [💬 Chatbot FAB]
```

### Technology View Layout

```
┌──────────────────── HEADER ──────────────────────────┐
│  📱 Safaricom  Technology Operations  [Biz] [Tech]   │
└──────────────────────────────────────────────────────┘
┌─────────── 5-KPI SHARED BAR ─────────────────────────┐
│  Revenue At Risk │ M-Pesa Success │ Active Users │ ...│
└──────────────────────────────────────────────────────┘
┌──────────────────── 2×2 ANALYTICS GRID ──────────────┐
│  ┌──────────────────────┐  ┌────────────────────────┐ │
│  │ 💳 Bank TX Success   │  │ 🔌 API Health          │ │
│  │ Bar chart per bank   │  │ Status / Latency table │ │
│  │ [Incident Alert]     │  │ [Incident Alert]       │ │
│  └──────────────────────┘  └────────────────────────┘ │
│  ┌──────────────────────┐  ┌────────────────────────┐ │
│  │ 📡 Service Health    │  │ 🗺️ Regional Availability│ │
│  │ Voice/Data/SMS bars  │  │ Per-region GSM list    │ │
│  │ Worst site marker    │  │ Incident badges        │ │
│  │ [Incident Alert]     │  │ [Incident Alert]       │ │
│  └──────────────────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                              [💬 Chatbot FAB]
```

### Incident Alert Trigger Rules

| Panel | Alert Type | Trigger Condition |
|-------|-----------|-------------------|
| Bank TX Success | Warning (amber) | Any bank `successRate < 95%` |
| API Health | Critical (red) | Any bank `!connected` OR `latencyMs > 350` |
| Service Health | Warning (amber) | Voice OR Data OR SMS avg `< 94%` |
| Regional Availability | Critical (red) | Any region has sites `< 80%` availability |

---

## 10. Technology Stack

### Mock PoC Stack (Current)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + Vite | Fast HMR, minimal config, excellent DX |
| **Maps** | `@react-google-maps/api` | Full-featured Google Maps with Polygon + Marker |
| **Styling** | Pure CSS (custom design system) | No framework overhead, full control |
| **Backend** | Node.js 20 + Express 4 | Lightweight, fast mock API setup |
| **Real-time** | `ws` WebSocket library | Native, zero-dependency WebSocket server |
| **Data** | In-memory JavaScript objects | Zero config, instant restart |
| **Agent Engine** | Deterministic rule engine (JS) | No LLM cost, fully predictable for demo |

### Production Target Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Ingestion** | Apache Kafka / Strimzi | High-throughput, fault-tolerant financial/telecom events |
| **Stream Processing** | Apache Flink | Time-window joins (TX failure ↔ GSM location within 5 min) |
| **Lakehouse** | Apache Iceberg + Trino | ACID SQL across massive historic telecom + fintech datasets |
| **Backend Services** | Java / Spring Boot | Enterprise-grade, high concurrency, Kafka ecosystem |
| **AI Agent Framework** | LangGraph / CrewAI (Python) | Stateful, multi-agent workflows with memory and tool-calling |
| **Deployment** | Kubernetes (EKS / OpenShift) | Scalable containerized microservices |
| **Auth** | OAuth 2.0 / OIDC (Keycloak) | Enterprise SSO with RBAC for Business vs Technical personas |

---

## 11. Folder Structure

```
autonomes_brig/
├── .gitignore                    # Ignores node_modules, .env files
├── .env.example                  # Template for environment variables
├── package.json                  # Root package (backend)
├── SCOPE.md                      # This document
├── README.md                     # Quick-start guide
│
├── src/                          # Backend source
│   ├── index.js                  # Server entry — Express + WebSocket bootstrap
│   ├── data.js                   # Seed data: 15 towers, 8 banks, transactions
│   ├── db.js                     # In-memory DB access functions
│   ├── simulator.js              # Background metric mutation (5s interval)
│   ├── websocket.js              # WebSocket server + broadcast logic
│   │
│   ├── agents/
│   │   ├── mcp.js                # MCPMessage, MCPContext, MCPCoordinator
│   │   ├── businessAgent.js      # Business impact calculations + summaries
│   │   ├── techAgent.js          # Root cause analysis + recommendations
│   │   ├── orchestrator.js       # evaluateTower() + startOrchestrator()
│   │   └── baseAgent.js          # Abstract base agent class
│   │
│   └── routes/
│       ├── dashboard.js          # GET /api/dashboard/overview
│       ├── towers.js             # GET /api/dashboard/towers
│       └── chat.js               # POST /api/chat (NLP chatbot endpoint)
│
└── frontend/                     # React + Vite frontend
    ├── .env                      # VITE_GOOGLE_MAPS_API_KEY (git-ignored)
    ├── .env.example              # Key template for collaborators
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx               # Main component — all views, state, logic
        ├── main.jsx              # React DOM entry
        ├── style.css             # Full design system (dark theme, all components)
        └── regions.json          # Ethiopian GeoJSON region polygons
```

---

## 12. Production Architecture Vision

The production system follows an **Event-Driven Lambda/Kappa Architecture** with a **Multi-Agent AI Reasoning Layer**:

```
[ GSM Network Ops (NOC) ]  ──────────────────────────────────────────────┐
[ M-Pesa Core (G2) ]       ──► [ Kafka Ingestion Layer ]                 │
[ Bank Gateway Feeds ]     ──────────────────────────────────────────────┘
[ Core Network Billing ]                      │
                                              ▼
                            [ Flink Stream Processor ]
                            • Time-window TX ↔ Location joins
                            • Aggregation over 1/5/15 min windows
                            • Anomaly detection triggers
                                              │
                                              ▼
                             [ Apache Iceberg Lakehouse ]
                             • Historic telecom + fintech records
                             • ACID queries via Trino SQL engine
                                              │
              ┌───────────────────────────────┘
              ▼
   [ Multi-Agent AI System (LangGraph) ]
   ├── Network Diagnostics Agent
   │     • Correlates site health with TX failures
   │     • Generates field engineer dispatch tickets
   ├── Business Analytics Agent
   │     • Quantifies revenue impact per incident
   │     • Produces profitability rankings per region
   └── Orchestrator Agent
         • Routes queries between agents
         • Compiles combined insight reports
              │
              ▼
   [ API Gateway (Spring Boot) ]
   [ Frontend Dashboard (React) ]
   [ Mobile App / Notification System ]
```

---

## 13. Roadmap

### Phase 1 — PoC (Complete ✅)

- [x] Dual-view dashboard (Business + Technology)
- [x] 15 Ethiopian tower sites with live simulation
- [x] 8 bank API integrations with health monitoring
- [x] MCP multi-agent engine (BusinessAgent + TechAgent + Orchestrator)
- [x] Real-time WebSocket state broadcasting
- [x] Google Maps with 5-tier regional health coloring
- [x] Technology analytics panels with incident alerts
- [x] AI chatbot with live data NLP interface
- [x] Environment variable security for API keys

### Phase 2 — Production Foundation

- [ ] Replace in-memory store with PostgreSQL / TimescaleDB
- [ ] Add authentication (JWT + RBAC) — Business vs Technical roles
- [ ] Replace rule engine with LangGraph multi-agent framework
- [ ] Integrate real Kafka topics for simulated feeds
- [ ] Add historical trend charts (7-day, 30-day)
- [ ] Mobile-responsive layout

### Phase 3 — Live Integration

- [ ] Connect to actual NOC feeds (site availability events)
- [ ] Integrate M-Pesa G2 Core transaction log stream
- [ ] Connect to bank gateway health endpoints
- [ ] Deploy on Kubernetes (EKS or on-premise OpenShift)
- [ ] Implement Apache Iceberg lakehouse for historical analytics
- [ ] Replace Google Maps with on-premise MapTiler for data sovereignty

---

*Document version: 1.0 — May 2026*  
*Author: Eyobed Feleke*  
*Repository: [github.com/eyobed7b/Autonomes_Brig_Mock_System](https://github.com/eyobed7b/Autonomes_Brig_Mock_System)*
