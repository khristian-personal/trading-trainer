const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/setup
// Log a new setup (after checklist completed and entry submitted)
router.post('/setup', (req, res) => {
  const {
    session_id,
    instrument = 'MCL',
    strategy = 'ORB Pullback',
    direction,
    entry_price,
    stop_price,
    target_price,
    or_range_size,
    checklist_flags,
    setup_grade,
    notes
  } = req.body;

  if (!entry_price || !stop_price || !target_price) {
    return res.status(400).json({ error: 'entry_price, stop_price, and target_price are required' });
  }

  const risk   = Math.abs(entry_price - stop_price);
  const reward = Math.abs(target_price - entry_price);
  const rr_planned = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;

  if (rr_planned < 2) {
    return res.status(400).json({ error: `R:R is 1:${rr_planned} — minimum is 1:2` });
  }

  const result = db.prepare(`
    INSERT INTO setups (
      session_id, instrument, strategy, direction,
      entry_price, stop_price, target_price, rr_planned,
      or_range_size, checklist_flags, setup_grade, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session_id, instrument, strategy, direction,
    entry_price, stop_price, target_price, rr_planned,
    or_range_size,
    checklist_flags ? JSON.stringify(checklist_flags) : null,
    setup_grade, notes
  );

  const setup = db.prepare('SELECT * FROM setups WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(setup);
});

// PATCH /api/setup/:id/outcome
// Log the outcome after a trade closes
router.patch('/setup/:id/outcome', (req, res) => {
  const { id } = req.params;
  const { outcome, rr_actual, setup_grade, notes } = req.body;

  const validOutcomes = ['Win', 'Loss', 'No Trade', 'Invalid'];
  if (!validOutcomes.includes(outcome)) {
    return res.status(400).json({ error: `outcome must be one of: ${validOutcomes.join(', ')}` });
  }

  const counts = ['Win', 'Loss'].includes(outcome) ? 1 : 0;

  db.prepare(`
    UPDATE setups
    SET outcome = ?, rr_actual = ?, setup_grade = ?, notes = ?, counts_toward_milestone = ?
    WHERE id = ?
  `).run(outcome, rr_actual || null, setup_grade || null, notes || null, counts, id);

  const updated = db.prepare('SELECT * FROM setups WHERE id = ?').get(id);
  res.json(updated);
});

// GET /api/setups
// Fetch all setups with optional filters
router.get('/setups', (req, res) => {
  const { instrument, outcome, strategy } = req.query;

  let query = 'SELECT * FROM setups WHERE 1=1';
  const params = [];

  if (instrument) { query += ' AND instrument = ?'; params.push(instrument); }
  if (outcome)    { query += ' AND outcome = ?';    params.push(outcome); }
  if (strategy)   { query += ' AND strategy = ?';   params.push(strategy); }

  query += ' ORDER BY created_at DESC';

  const setups = db.prepare(query).all(...params);
  res.json(setups);
});

module.exports = router;
