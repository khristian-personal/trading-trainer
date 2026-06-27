# Trading Trainer — Product Requirements Document

**Author:** Khris Walker  
**Date:** 2026-06-26  
**Status:** Draft v1 — Approved for build  
**Project:** Personal Operating System / Homelab Portfolio

---

## Overview

This document describes the requirements for a self-built, web-based day trading trainer designed to support disciplined futures trading on Micro Crude Oil (MCL) and Micro NQ (MNQ).

The trainer is one layer in a larger personal operating system: a scheduled morning briefing agent (Node.js, runs at 6am) pulls live crude oil prices, an economic calendar, Gmail newsletters, and account balance data, then classifies each trading day as Aggressive, Defensive, or Sit Out. The trainer is what opens next. It takes that classification, enforces a pre-trade checklist against it, gates the entry form behind a minimum risk:reward threshold, logs every outcome, and surfaces behavioral patterns over time.

This project is also a portfolio artifact demonstrating: full-stack Node.js development, REST API and webhook integration, SQLite database design, Docker containerization, Linux VPS deployment, and Tailscale-based private networking.

---

## 1. Problem Statement

Day trading without structure is just gambling with extra steps. A trader can know a strategy intellectually and still abandon it under real-time pressure: skipping checklist conditions because the setup "feels right," taking trades with poor risk:reward because the opportunity seems obvious, or failing to log outcomes because logging feels like overhead when the market is moving.

The gap this project fills: there is no structured tool between "here is today's market context" and "I executed a trade." Without a checklist to enforce, conditions get skipped. Without an R:R gate, bad trades get entered. Without a log, there is no feedback loop, and no foundation for the 20-setup milestone required to unlock the second instrument.

The trainer enforces the process so that discipline is built into the workflow, not dependent on willpower in the moment.

---

## 2. Success Criteria

- Opening the trainer on an iPad after the morning briefing immediately surfaces today's market context and session classification
- Every potential trade is gated behind a sequential 8-step checklist; the entry form does not appear until all conditions are verified
- The entry form enforces a minimum 1:2 R:R; submission is disabled below threshold
- Every completed trade is logged with enough context to generate pattern insights over time
- The 20-setup MCL milestone is tracked accurately; MNQ is locked until it is hit
- The app runs in Docker, deploys to a Linux VPS, and is accessible across all devices via Tailscale
- The codebase and commit history are clean enough to present as a portfolio project

---

## 3. Scope

### In Scope (Phase 1)
- Session dashboard: briefing classification, MCL context panel, milestone counter
- ORB Pullback checklist for MCL — 8-step sequential gate
- Trade entry form with live R:R calculation and 1:2 minimum gate
- Trade log: Core + Context + Reflection fields
- Setup review: sortable log table, stats panel, and pattern callout layer
- MNQ tab: visible, locked, showing progress toward 20-setup milestone
- TradingView webhook receiver: populates OR levels automatically
- Sit Out banner: soft warning, does not block entry
- Docker + Docker Compose for local dev and VPS deployment
- SQLite database

### Out of Scope (Phase 1 — future modules)
- VWAP Reclaim strategy module
- Failed Breakout / Liquidity Sweep strategy module
- Volume Profile / Point of Control strategy module
- AI stress-test feature ("poke holes in my setup")
- MNQ active trading (unlocks post-milestone)
- Multi-user support
- Mobile-native app

---

## 4. Design Constraints

| Constraint | Detail | UX Implication |
|-----------|--------|----------------|
| Primary device | iPad, landscape orientation | Touch-friendly targets, no hover states, landscape layout |
| Multi-device access | PC, iPad, phone via Tailscale | Responsive layout; tested at 768px+ |
| Deployment | localhost (dev), Linux VPS (prod) | Docker from day one; local and prod environments are identical |
| Real-time data | TradingView webhook; manual fallback | OR levels auto-populate; fallback input always available |
| Single user | No auth required | Simplified data model; no sessions or accounts |
| Checklist discipline | Sequential gate; no skipping | Each step appears only after the previous is acknowledged |

---

## 5. Background: Instrument Logic

**MCL (Micro Crude Oil):** Primary learning instrument. Crude oil is driven by geopolitical events, EIA inventory data, and supply/demand fundamentals. The morning briefing already tracks live crude prices and the economic calendar, giving the trader daily context before the session opens.

**MNQ (Micro NQ):** Secondary instrument, locked until 20 MCL trades are logged. MNQ tracks the Nasdaq-100 and is driven by tech sentiment, Fed policy, and risk appetite. The morning briefing also surfaces AI and tech news via the TLDR newsletter each morning, providing an informational edge on NQ-moving stories before open. MCL and MNQ pair naturally as a risk-on/risk-off pair: when they agree in direction, conviction is higher; when they diverge, that divergence is itself a signal.

**Why the milestone gate:** 20 logged MCL trades before MNQ is a hard constraint. The goal is to build pattern recognition on one instrument before adding another. The trainer enforces this gate in the UI; it is not advisory.

---

## 6. Feature Specifications

### 6.1 Session Dashboard

The entry point each morning. Surfaces today's context before the checklist begins.

**Components:**
- **Briefing Classification Banner:** Aggressive (green) / Defensive (yellow) / Sit Out (red). Pulled from briefing output or manually set at session start. On Sit Out: persistent banner reads "Briefing: Sit Out. Trading not recommended today." Override button visible but requires a deliberate tap.
- **OR Timeframe Indicator:** Aggressive = 15-minute range; Defensive = 30-minute range. Displayed prominently; not user-adjustable per session.
- **MCL Context Panel:**
  - Current price (from TradingView webhook or manual entry)
  - Opening Range High (ORH) and Low (ORL) — populated automatically when the OR timeframe closes
  - VWAP — populated via webhook or manual entry
  - OR status badge: "Waiting" / "Formed"
- **Milestone Counter:** "MCL Setups: X / 20" with a progress bar. MNQ tab grayed out with lock icon.
- **Start Checklist button:** Disabled until ORH and ORL are populated. Activates when OR is marked formed.

---

### 6.2 ORB Pullback Checklist (8 Steps)

Sequential. Each step must be acknowledged before the next appears. Prevents skipping under pressure and builds the habit of checking each condition explicitly.

**The strategy (brief):** The Opening Range is the high and low formed in the first 15 or 30 minutes after open. A breakout above the range high is a bullish signal; below the range low is bearish. Rather than chasing the initial breakout, the entry is taken on the pullback retest of that level — after confirmation that the breakout level is holding as support or resistance — with a defined stop and target before entry.

**Steps (in order):**

| Step | Condition | Response Type |
|------|-----------|---------------|
| 1 | **News/Catalyst Check:** No major scheduled economic event in the next 60 minutes (e.g., EIA Petroleum Report, FOMC statement, CPI release). | Confirm clear / Abort |
| 2 | **Opening Range Formed:** ORH and ORL are confirmed for the active timeframe (15 or 30 min). Levels are marked on chart. | Confirm |
| 3 | **Breakout Occurred:** Price broke above ORH or below ORL on a clearly elevated volume candle. | Long / Short / No breakout (exit checklist) |
| 4 | **Pullback in Progress:** Price is returning toward the broken level. Has not fully re-entered the opening range. | Confirm / Setup invalid |
| 5 | **Pullback Volume:** Volume on the pullback candles is lighter than the breakout candle. | Confirm / Caution (flag, not auto-block) |
| 6 | **Confirmation Candle:** A rejection wick, bullish/bearish engulfing candle, or pin bar has formed at the retest level. | Confirm / Not yet (wait) |
| 7 | **VWAP Alignment:** Longs: price is above VWAP. Shorts: price is below VWAP. | Confirm / Soft warning (can override with note) |
| 8 | **Entry Parameters:** User inputs entry, stop, and target. Trainer calculates R:R in real time. R:R ≥ 1:2 required to unlock submit. | Input form |

**Checklist behaviors:**
- Abort at Step 1 → logged as "Invalid — news event"
- No breakout at Step 3 → logged as "Invalid — no setup"
- Heavy volume flag at Step 5 → warning modal; user must confirm to proceed
- VWAP misalignment at Step 7 → warning modal; user can override, flag stored in log
- All steps confirmed + R:R ≥ 1:2 at Step 8 → submit unlocks

---

### 6.3 Trade Entry Form and R:R Gate

Appears at Step 8 of the checklist.

**Fields:**
- Direction: Long / Short (auto-filled from Step 3)
- Entry price
- Stop price
- Target price
- Calculated R:R (live, updates as user types)
- Submit button — disabled if R:R < 1:2

**R:R calculation:**
```
Risk   = |Entry − Stop|   × $10  (MCL point value)
Reward = |Target − Entry| × $10
R:R    = Reward / Risk
```

If R:R < 1:2: "R:R is 1:X — minimum is 1:2. Adjust your target or tighten your stop."

---

### 6.4 Trade Outcome Logging

After entry is submitted, the setup is saved with status "Open." When the trade closes, the user returns and logs the outcome.

**Outcome options:**
- Win — hit target
- Loss — stopped out
- No trade — setup formed, passed on entry (does not count toward milestone)
- Invalid — setup never materialized (does not count toward milestone)

**Log fields:**

*Core:* Date, instrument, strategy, direction, entry/stop/target prices, planned R:R, actual R:R, outcome

*Context:* OR range size (ORH − ORL in points), briefing classification, checklist steps that flagged a warning

*Reflection:* Setup quality grade (A = textbook, B = acceptable, C = marginal), free-text notes (1–3 sentences: what was seen, what happened, what to do differently)

---

### 6.5 Trade Review and Pattern Callouts

Accessible from the main nav.

**Log Table:** Sortable, filterable. Columns: Date, Instrument, Direction, Outcome, Grade, R:R, Briefing classification.

**Stats Panel:**
- Win rate (wins / total trades entered)
- Average R:R achieved vs. planned
- Current win/loss streak
- MCL milestone progress
- Grade distribution (A/B/C breakdown)

**Pattern Callouts** (activates at ≥5 logged setups): The trainer analyzes the log and surfaces observations automatically. Examples:
- "Your last 4 losses were all C-grade setups. Consider tightening your entry criteria."
- "Win rate on Aggressive days: 67%. Win rate on Defensive days: 25%. Your edge is concentrated in Aggressive sessions."
- "You've overridden the VWAP warning 3 times. All 3 resulted in losses."
- "You haven't taken a trade in 5 sessions. Are you seeing setups and passing, or is the market not offering them?"

Callouts display as a card above the log table and refresh on page load.

---

### 6.6 MNQ Milestone Gate

MNQ tab is always visible in navigation but locked until 20 MCL trades (Win or Loss outcomes only) are logged.

**Locked state:**
- Tab label: "MNQ — Locked (X/20)"
- Clicking the tab shows a milestone progress screen with counter, recent MCL log, and unlock criteria
- Message: "Complete 20 MCL paper trades to unlock Micro NQ trading."

**Unlocked state:**
- MNQ tab activates fully
- MNQ session dashboard mirrors MCL dashboard with NQ-specific data
- MNQ maintains its own checklist runs, log, and stats

---

### 6.7 TradingView Webhook Integration

TradingView alerts push OR data to the trainer's backend when the opening range closes.

**Endpoint:** `POST /api/webhook/tradingview`

**Expected payload:**
```json
{
  "instrument": "MCL",
  "event": "or_formed",
  "orh": 72.45,
  "orl": 71.80,
  "vwap": 72.10,
  "timeframe": 15,
  "timestamp": "2026-06-26T09:45:00Z"
}
```

**On receipt:** Validate payload → store to today's session in SQLite → push to connected clients via WebSocket → dashboard OR levels populate; Start Checklist activates.

**Manual fallback:** If no webhook is received, an "Enter levels manually" button appears. User inputs ORH, ORL, and VWAP by hand before starting the checklist.

---

## 7. Technical Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend | Node.js + Express | Lightweight, sufficient for this scale; widely recognized |
| Frontend | Vanilla HTML/CSS/JS + TradingView Lightweight Charts | Free, embeddable charting library; no framework overhead for v1 |
| Database | SQLite via `better-sqlite3` | Single-file, zero-config, appropriate for a single-user app |
| Realtime | WebSocket (`ws` library) | Pushes OR data from webhook to frontend without a page refresh |
| Containerization | Docker + Docker Compose | Local dev = prod parity; clean VPS deployment story |
| Networking | Tailscale | Private mesh network; secure access from any device without port forwarding |

### Data Models

**sessions table**
```sql
CREATE TABLE sessions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  date                   TEXT NOT NULL,              -- YYYY-MM-DD
  instrument             TEXT NOT NULL,              -- 'MCL' | 'MNQ'
  briefing_classification TEXT,                      -- 'Aggressive' | 'Defensive' | 'Sit Out'
  or_timeframe           INTEGER,                    -- 15 | 30
  orh                    REAL,
  orl                    REAL,
  vwap                   REAL,
  or_formed              INTEGER DEFAULT 0,          -- boolean
  created_at             TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**setups table**
```sql
CREATE TABLE setups (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id               INTEGER REFERENCES sessions(id),
  instrument               TEXT NOT NULL,
  strategy                 TEXT NOT NULL DEFAULT 'ORB Pullback',
  direction                TEXT,                     -- 'Long' | 'Short'
  entry_price              REAL,
  stop_price               REAL,
  target_price             REAL,
  rr_planned               REAL,
  rr_actual                REAL,
  outcome                  TEXT,                     -- 'Win' | 'Loss' | 'No Trade' | 'Invalid'
  or_range_size            REAL,
  checklist_flags          TEXT,                     -- JSON array of flagged step numbers
  setup_grade              TEXT,                     -- 'A' | 'B' | 'C'
  notes                    TEXT,
  counts_toward_milestone  INTEGER DEFAULT 0,        -- 1 if Win or Loss
  created_at               TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### API Routes

```
GET   /api/session/today         Get or create today's session record
POST  /api/webhook/tradingview   Receive OR levels from TradingView alert
POST  /api/setup                 Submit a new logged setup
PATCH /api/setup/:id/outcome     Log outcome after trade closes
GET   /api/setups                Fetch all setups (supports filters)
GET   /api/stats                 Milestone counter, win rate, streak
GET   /api/patterns              Pattern callout analysis
```

### Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data      # SQLite file persists here across container restarts
    environment:
      - NODE_ENV=production
      - PORT=3000
```

---

## 8. Strategy Module Progression

The trainer is architected as a module system. Each strategy is a self-contained tab with its own checklist, log, and stats. Strategies unlock in sequence as milestone thresholds are hit.

| Phase | Strategy | Unlock Condition |
|-------|----------|-----------------|
| 1 | ORB Pullback | Default — always available |
| 2 | VWAP Reclaim | 20 logged ORB setups |
| 3 | Failed Breakout / Liquidity Sweep | 10 logged VWAP Reclaim setups |
| 4 | Volume Profile / Point of Control | Manual unlock after dedicated study |

**VWAP Reclaim:** Price drops below VWAP, consolidates, then reclaims it with volume. Used as a standalone strategy and as a confluence filter for ORB setups.

**Failed Breakout / Liquidity Sweep:** The ORB breakout is a trap; retail stops get hunted before the real move reverses. Teaches recognition of where price runs before reversing.

**Volume Profile / POC:** Identify the Point of Control from the prior session; trade reactions at that structural level. An analytical layer applied over the other strategies.

---

## 9. Morning Session UX Flow

```
Open trainer on iPad (post-briefing)
           ↓
Session Dashboard
  ├── Briefing classification banner
  ├── Active OR timeframe (15 or 30 min)
  ├── MCL context panel (price, ORH, ORL, VWAP)
  └── Milestone counter: X / 20 MCL trades
           ↓
OR formed? → "Start Checklist" activates
           ↓
Step 1: News check       → clear / abort
Step 2: OR confirmed     → confirm
Step 3: Breakout         → Long / Short / no breakout (exit)
Step 4: Pullback active  → confirm / invalid
Step 5: Volume check     → confirm / caution flag
Step 6: Confirm candle   → confirm / wait
Step 7: VWAP alignment   → confirm / soft override
Step 8: Entry params     → input entry, stop, target; R:R calculated live
           ↓
R:R ≥ 1:2 → Submit unlocks → Setup logged as "Open"
           ↓
Trade closes → return to log → select outcome, grade, notes
           ↓
Milestone counter updates; pattern callouts refresh
```

---

## 10. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Which TradingView plan tier supports webhook alerts for futures? | To verify — likely Essential or higher |
| 2 | Pine Script alert template for sending MCL OR levels in the correct payload format | To build |
| 3 | VPS provider selection (DigitalOcean, Linode, Vultr) | Khris to decide; est. $4–6/mo |
| 4 | Domain or subdomain for the VPS deployment | Optional; Tailscale IP works; domain is cleaner as a portfolio URL |
| 5 | Integration path for morning briefing classification: API call, shared config file, or manual input at session start | To design |
| 6 | AI stress-test feature: model selection, prompt structure, input format | Phase 2 |
| 7 | MNQ unlock: should the trainer surface NQ-specific news from TLDR newsletter when MNQ becomes active? | Phase 2 |

---

## 11. Constraints and Hard Rules

- **Paper trade only.** The trainer has no connection to live order execution. There is no brokerage API write access; this is enforced by design.
- **MNQ milestone gate is non-negotiable.** The tab unlocks after exactly 20 MCL trades (Win or Loss). No-trade and Invalid outcomes do not count. This rule is enforced in the UI, not just documented.
- **R:R minimum is enforced by the UI.** The submit button is disabled when R:R < 1:2. It is not a warning; it is a hard gate.
- **OR timeframe is set by briefing classification.** It is not a per-session user setting.
- **Data stays local.** SQLite on disk. No cloud sync, no third-party analytics, no external data storage.
