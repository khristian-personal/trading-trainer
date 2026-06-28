# Trading Trainer

A self-built, web-based day trading trainer for Micro Crude Oil (MCL) and Micro NQ (MNQ) futures. Built as part of a larger personal operating system and as a homelab portfolio project.

## What it does

A scheduled morning briefing agent (separate service) runs at 6am and classifies each trading day as **Aggressive**, **Defensive**, or **Sit Out** based on live crude oil prices, the economic calendar, and account balance data. This trainer is the next layer: it takes that classification, enforces a pre-trade checklist against it, gates the entry form behind a minimum 1:2 risk:reward threshold, logs every outcome, and surfaces behavioral patterns over time.

**Core features:**
- Session dashboard: briefing classification, live OR levels (via TradingView webhook), VWAP, milestone counter
- 8-step ORB Pullback checklist — sequential, no skipping
- R:R gate: entry form is disabled until risk:reward meets the 1:2 minimum
- Trade log with core data, session context, and reflection fields (grade + notes)
- Pattern callouts: surfaces behavioral trends across logged setups
- MNQ instrument locked until 20 MCL trades are logged — milestone gate enforced in UI
- Modular strategy architecture: VWAP Reclaim, Failed Breakout, and Volume Profile modules slot in as future phases

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | Vanilla HTML/CSS/JS + TradingView Lightweight Charts |
| Database | SQLite via `better-sqlite3` |
| Realtime | WebSocket (`ws`) |
| Containerization | Docker + Docker Compose |
| Networking | Tailscale (private mesh access across PC, iPad, phone) |

## Getting started

**Local development:**
```bash
git clone https://github.com/YOUR_USERNAME/trading-trainer.git
cd trading-trainer
cp .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:3000`

**Docker (production):**
```bash
docker compose up -d
```

SQLite database persists in the `./data` directory via volume mount.

## Project structure

```
trading-trainer/
├── src/
│   ├── index.js          # Express app + WebSocket server
│   ├── db.js             # SQLite connection and schema init
│   └── routes/
│       ├── session.js    # GET /api/session/today
│       ├── setups.js     # POST /api/setup, PATCH, GET
│       ├── stats.js      # GET /api/stats
│       ├── patterns.js   # GET /api/patterns
│       └── webhook.js    # POST /api/webhook/tradingview
├── public/
│   ├── index.html        # Session dashboard
│   ├── checklist.html    # ORB Pullback checklist flow
│   ├── log.html          # Trade log and review
│   ├── js/
│   └── css/
├── data/                 # SQLite database (gitignored)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Roadmap

- [x] PRD and architecture
- [x] Project scaffold
- [ ] SQLite schema + Express skeleton
- [ ] Session dashboard with manual OR entry
- [ ] ORB checklist flow (8 steps)
- [ ] Trade entry form with R:R gate
- [ ] Trade log and review
- [ ] TradingView webhook integration
- [ ] Pattern callout engine
- [ ] VPS deployment
- [ ] VWAP Reclaim strategy module (Phase 2)

## Related

- [Product Requirements Document](../trading-trainer-PRD.md)
