const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/patterns
// Analyzes the setup log and returns behavioral callouts
// Requires at least 5 logged setups to activate
router.get('/patterns', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM setups WHERE outcome IS NOT NULL').get();

  if (total.count < 5) {
    return res.json({ active: false, message: `Pattern analysis activates after 5 logged setups. You have ${total.count}.`, callouts: [] });
  }

  const callouts = [];

  // --- Pattern 1: Last N losses were all C-grade ---
  const recentLosses = db.prepare(`
    SELECT setup_grade FROM setups
    WHERE outcome = 'Loss'
    ORDER BY created_at DESC
    LIMIT 4
  `).all();

  if (recentLosses.length >= 4 && recentLosses.every(r => r.setup_grade === 'C')) {
    callouts.push({
      type: 'warning',
      message: `Your last ${recentLosses.length} losses were all C-grade setups. Consider tightening your entry criteria.`
    });
  }

  // --- Pattern 2: Win rate by briefing classification ---
  const byClass = db.prepare(`
    SELECT s.briefing_classification,
           COUNT(*) as total,
           SUM(CASE WHEN st.outcome = 'Win' THEN 1 ELSE 0 END) as wins
    FROM setups st
    JOIN sessions s ON st.session_id = s.id
    WHERE st.outcome IN ('Win', 'Loss') AND s.briefing_classification IS NOT NULL
    GROUP BY s.briefing_classification
  `).all();

  byClass.forEach(row => {
    const rate = Math.round((row.wins / row.total) * 100);
    if (row.total >= 3) {
      if (rate >= 70) {
        callouts.push({ type: 'insight', message: `Win rate on ${row.briefing_classification} days: ${rate}%. Your edge is strongest in ${row.briefing_classification} sessions.` });
      } else if (rate <= 30 && row.total >= 4) {
        callouts.push({ type: 'warning', message: `Win rate on ${row.briefing_classification} days: ${rate}% across ${row.total} trades. Consider sitting out ${row.briefing_classification} sessions until you identify what's different.` });
      }
    }
  });

  // --- Pattern 3: VWAP override correlation with losses ---
  const vwapOverrides = db.prepare(`
    SELECT outcome FROM setups
    WHERE checklist_flags LIKE '%7%' AND outcome IN ('Win', 'Loss')
  `).all();

  if (vwapOverrides.length >= 3) {
    const overrideLosses = vwapOverrides.filter(r => r.outcome === 'Loss').length;
    if (overrideLosses === vwapOverrides.length) {
      callouts.push({ type: 'warning', message: `You've overridden the VWAP alignment warning ${vwapOverrides.length} times. All ${overrideLosses} resulted in losses. Stop overriding VWAP.` });
    }
  }

  // --- Pattern 4: Long drought without a trade ---
  const recentSetups = db.prepare(`
    SELECT outcome FROM setups ORDER BY created_at DESC LIMIT 5
  `).all();

  const noTrades = recentSetups.filter(r => r.outcome === 'No Trade' || r.outcome === 'Invalid').length;
  if (noTrades >= 5) {
    callouts.push({ type: 'info', message: `You haven't entered a trade in your last 5 sessions. Are you seeing setups and passing, or is the market not offering them?` });
  }

  res.json({ active: true, callouts });
});

module.exports = router;
