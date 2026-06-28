const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/session/today
// Returns today's session, creating one if it doesn't exist
router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  let session = db.prepare(`
    SELECT * FROM sessions WHERE date = ? AND instrument = 'MCL'
  `).get(today);

  if (!session) {
    const result = db.prepare(`
      INSERT INTO sessions (date, instrument) VALUES (?, 'MCL')
    `).run(today);

    session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
  }

  res.json(session);
});

// PATCH /api/session/:id
// Update session fields (briefing classification, OR levels, VWAP, or_formed)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { briefing_classification, or_timeframe, orh, orl, vwap, or_formed } = req.body;

  const fields = [];
  const values = [];

  if (briefing_classification !== undefined) { fields.push('briefing_classification = ?'); values.push(briefing_classification); }
  if (or_timeframe !== undefined)            { fields.push('or_timeframe = ?');            values.push(or_timeframe); }
  if (orh !== undefined)                     { fields.push('orh = ?');                     values.push(orh); }
  if (orl !== undefined)                     { fields.push('orl = ?');                     values.push(orl); }
  if (vwap !== undefined)                    { fields.push('vwap = ?');                    values.push(vwap); }
  if (or_formed !== undefined)               { fields.push('or_formed = ?');               values.push(or_formed ? 1 : 0); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  res.json(updated);
});

module.exports = router;
