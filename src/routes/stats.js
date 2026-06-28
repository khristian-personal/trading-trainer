const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stats
// Returns milestone counter, win rate, streak, grade distribution
router.get('/stats', (req, res) => {
  // MCL milestone: count of Win or Loss outcomes on MCL
  const milestone = db.prepare(`
    SELECT COUNT(*) as count FROM setups
    WHERE instrument = 'MCL' AND counts_toward_milestone = 1
  `).get();

  // Win rate (trades only — Win or Loss)
  const tradeCount = db.prepare(`
    SELECT COUNT(*) as count FROM setups WHERE outcome IN ('Win', 'Loss')
  `).get();

  const winCount = db.prepare(`
    SELECT COUNT(*) as count FROM setups WHERE outcome = 'Win'
  `).get();

  const winRate = tradeCount.count > 0
    ? Math.round((winCount.count / tradeCount.count) * 100)
    : null;

  // Average planned R:R
  const avgRR = db.prepare(`
    SELECT AVG(rr_planned) as avg FROM setups WHERE rr_planned IS NOT NULL
  `).get();

  // Grade distribution
  const grades = db.prepare(`
    SELECT setup_grade, COUNT(*) as count FROM setups
    WHERE setup_grade IS NOT NULL
    GROUP BY setup_grade
  `).all();

  // Current streak
  const recent = db.prepare(`
    SELECT outcome FROM setups
    WHERE outcome IN ('Win', 'Loss')
    ORDER BY created_at DESC
    LIMIT 20
  `).all();

  let streak = 0;
  let streakType = null;
  for (const row of recent) {
    if (streakType === null) streakType = row.outcome;
    if (row.outcome === streakType) streak++;
    else break;
  }

  res.json({
    milestone: {
      completed: milestone.count,
      required: 20,
      mcn_unlocked: milestone.count >= 20
    },
    win_rate_pct: winRate,
    total_trades: tradeCount.count,
    avg_rr_planned: avgRR.avg ? parseFloat(avgRR.avg.toFixed(2)) : null,
    streak: streak > 0 ? { type: streakType, count: streak } : null,
    grade_distribution: grades
  });
});

module.exports = router;
