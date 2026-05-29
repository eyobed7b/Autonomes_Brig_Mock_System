# Autonomes Brig Mock System

This repository contains a mock backend for an Intelligent Operations & Business Assurance Bridge. It implements a simplified Multi-Agent Coordination Protocol (MCP) using a deterministic rule-based orchestrator and specialized agents.

## What this includes

- Express API serving tower health and agent insights
- In-memory mock data for telecom towers, GSM KPIs (voice, SMS, data), and MPESA transactions
- A background simulator that generates GSM health anomalies and MPESA transaction events
- A multi-agent orchestration layer following an MCP-style message exchange

## Key concepts

- `MCPCoordinator`: coordinates specialized agents and message flow
- `BusinessAgent`: computes revenue at risk and business summaries
- `TechAgent`: identifies root causes and recommended actions
- `Orchestrator`: runs a periodic evaluation cycle and updates insights

## Run the mock system

1. Install dependencies:

```bash
cd /Users/eyobedfeleke/Desktop/mine/autonomes_brig
npm install
```

2. Start the server:

```bash
npm start
```

3. Open the API endpoints:

- `GET http://localhost:4000/api/dashboard/overview`
- `GET http://localhost:4000/api/dashboard/towers`

The dashboard now returns GSM KPI fields such as `voiceSuccessRate`, `smsSuccessRate`, `dataSuccessRate`, `dataThroughputMbps`, and MPESA transaction summaries like `mpesaSuccessRate`, `mpesaTransactionCount`, `mpesaFailedAmount`, and `mpesaSuccessAmount`.

## Next step

This is intentionally a lightweight backend scaffold. You can extend it with a React/Vite frontend or wire it into a dashboard to visualize Business vs Technical views.

## Frontend dashboard

A React/Vite frontend has been added under `frontend/`.

1. Open a separate terminal and install frontend dependencies:

```bash
cd /Users/eyobedfeleke/Desktop/mine/autonomes_brig/frontend
npm install
```

2. Start the frontend app:

```bash
npm run dev
```

3. Keep the backend running on port `4000` and open the Vite URL shown in the browser.

The frontend displays:

- Business and Technical view toggle
- Revenue at risk and availability cards
- Tower-level MCP-generated insights
