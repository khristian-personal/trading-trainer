const express = require('express');
const router = express.Router();
const db = require('../db');
const { broadcast } = require('../ws');

// POST /api/webhook/tradingview
// Receives OR level data from a TradingView alert
//
// Expected payload:
// {
//   "instrument": "MCL",
//   "event": "or_formed",
//   "orh": 72.45,
//   "orl": 71.80,
//   "vwap": 72.10,
//   "timeframe": 15,
//   "timestamp": "2026-06-26T09:45:00Z"
// }
router.post('/tradingview', (req, res) => {
  const { instrument, event, orh, orl, vwap, timeframe, timestamp } = req.body;

  if (!instrument || !event) {
    return res.status(400).json({ error: 'instrument and event are required' });
  }

  if (event === 'or_formed') {
    if (!orh || !orl) {
      return res.status(400).json({ error: 'orh and orl are required for or_formed event' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Find or create today's session for this instrument
    let session = db.prepare(`
      SELECT * FROM sessions WHERE date = ? AND instrument = ?
    `).get(today, instrument);

    if (!session) {
      const result = db.prepare(`
        INSERT INTO sessions (date, instrument, orh, orl, vwap, or_timeframe, or_formed)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(today, instrument, orh, orl, vwap || null, timeframe || null);
      session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
    } else {
      db.prepare(`
        UPDATE sessions SET orh = ?, orl = ?, vwap = ?, or_timeframe = ?, or_formed = 1 WHERE id = ?
      `).run(orh, orl, vwap || null, timeframe || null, session.id);
      session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
    }

    // Broadcast to all connected clients so the dashboard updates live
    broadcast({ type: 'or_formed', session });

    return res.json({ received: true, session });
  }

  // Unknown event type — log and acknowledge
  console.log(`Received unknown TradingView event: ${event}`, req.body);
  res.json({ received: true, note: `Event type '${event}' not handled` });
});

module.exports = router;
