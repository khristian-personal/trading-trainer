// Log — Trading Trainer
// Handles trade log table, stats panel, pattern callouts, and outcome logging

let allSetups = [];

async function init() {
  await Promise.all([loadStats(), loadPatterns(), loadSetups()]);
}

async function loadStats() {
  const res  = await fetch('/api/stats');
  const data = await res.json();

  document.getElementById('stat-win-rate').textContent    = data.win_rate_pct !== null ? `${data.win_rate_pct}%` : '—';
  document.getElementById('stat-total-trades').textContent = data.total_trades;
  document.getElementById('stat-avg-rr').textContent      = data.avg_rr_planned ? `1:${data.avg_rr_planned}` : '—';
  document.getElementById('stat-milestone').textContent   = `${data.milestone.completed}/20`;

  if (data.streak) {
    const icon = data.streak.type === 'Win' ? '🟢' : '🔴';
    document.getElementById('stat-streak').textContent = `${icon} ${data.streak.count}`;
  }
}

async function loadPatterns() {
  const res  = await fetch('/api/patterns');
  const data = await res.json();

  const section   = document.getElementById('patterns-section');
  const container = document.getElementById('patterns-container');

  if (!data.active) return;

  section.style.display = 'block';
  container.innerHTML = data.callouts.map(c =>
    `<div class="callout callout--${c.type}">${c.message}</div>`
  ).join('');
}

async function loadSetups(filters = {}) {
  const params = new URLSearchParams(filters);
  const res    = await fetch(`/api/setups?${params}`);
  allSetups    = await res.json();

  renderOpenTrades();
  renderTable(allSetups);
}

function renderOpenTrades() {
  const open    = allSetups.filter(s => !s.outcome && s.entry_price);
  const section = document.getElementById('open-trades-section');
  const container = document.getElementById('open-trades-container');

  if (open.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = open.map(s => `
    <div class="open-trade-card">
      <div>
        <strong>${s.instrument}</strong> · ${s.direction} · Entry: ${s.entry_price} · Stop: ${s.stop_price} · Target: ${s.target_price}
        <br><small style="color: var(--color-text-muted)">${s.created_at?.split('T')[0]}</small>
      </div>
      <button class="btn btn--primary btn--small" onclick="openOutcomeModal(${s.id})">Log Outcome</button>
    </div>
  `).join('');
}

function renderTable(setups) {
  const tbody = document.getElementById('log-tbody');

  if (setups.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No setups logged yet.</td></tr>';
    return;
  }

  tbody.innerHTML = setups.map(s => {
    const outcomeClass = s.outcome === 'Win' ? 'outcome-win' : s.outcome === 'Loss' ? 'outcome-loss' : 'outcome-neutral';
    return `
      <tr>
        <td>${s.created_at?.split('T')[0] || '—'}</td>
        <td>${s.instrument}</td>
        <td>${s.direction || '—'}</td>
        <td>${s.rr_planned ? `1:${s.rr_planned}` : '—'}</td>
        <td class="${outcomeClass}">${s.outcome || 'Open'}</td>
        <td>${s.setup_grade || '—'}</td>
        <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.notes || '—'}</td>
      </tr>
    `;
  }).join('');
}

// Filters
document.getElementById('filter-btn')?.addEventListener('click', () => {
  const filters = {};
  const instrument = document.getElementById('filter-instrument').value;
  const outcome    = document.getElementById('filter-outcome').value;
  if (instrument) filters.instrument = instrument;
  if (outcome)    filters.outcome    = outcome;
  loadSetups(filters);
});

// Outcome modal
function openOutcomeModal(setupId) {
  document.getElementById('outcome-setup-id').value = setupId;
  document.getElementById('selected-outcome').value  = '';
  document.getElementById('actual-rr').value         = '';
  document.getElementById('outcome-notes').value     = '';
  document.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('outcome-modal').style.display = 'flex';
}

document.querySelectorAll('.outcome-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.outcome-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('selected-outcome').value = btn.dataset.outcome;
  });
});

document.getElementById('cancel-outcome-btn')?.addEventListener('click', () => {
  document.getElementById('outcome-modal').style.display = 'none';
});

document.getElementById('save-outcome-btn')?.addEventListener('click', async () => {
  const id      = document.getElementById('outcome-setup-id').value;
  const outcome = document.getElementById('selected-outcome').value;
  const rrActual = parseFloat(document.getElementById('actual-rr').value) || null;
  const grade   = document.getElementById('final-grade').value;
  const notes   = document.getElementById('outcome-notes').value;

  if (!outcome) { alert('Please select an outcome.'); return; }

  await fetch(`/api/setup/${id}/outcome`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome, rr_actual: rrActual, setup_grade: grade, notes })
  });

  document.getElementById('outcome-modal').style.display = 'none';
  await init();
});

init();
