// Dashboard — Trading Trainer
// Handles session context, manual OR entry, briefing classification, milestone counter

let sessionId = null;

async function init() {
  await loadSession();
  await loadMilestone();
  connectWebSocket();
}

async function loadSession() {
  const res = await fetch('/api/session/today');
  const session = await res.json();
  sessionId = session.id;
  renderSession(session);
}

function renderSession(session) {
  // Classification banner
  const banner = document.getElementById('classification-banner');
  const label  = document.getElementById('classification-label');
  const sitout = document.getElementById('sitout-warning');
  const select = document.getElementById('classification-select');

  if (session.briefing_classification) {
    const cls = session.briefing_classification;
    label.textContent = `Briefing: ${cls}`;
    banner.className = `banner banner--${cls.toLowerCase().replace(' ', '')}`;
    if (select) select.value = cls;

    if (cls === 'Sit Out') {
      sitout.style.display = 'block';
    }

    // OR timeframe based on classification
    const tf = cls === 'Aggressive' ? 15 : cls === 'Defensive' ? 30 : null;
    if (tf) {
      document.getElementById('or-timeframe').textContent = `${tf} min`;
      session.or_timeframe = tf;
    }
  } else {
    label.textContent = 'Set today\'s briefing classification →';
  }

  // OR levels
  if (session.orh) document.getElementById('orh').textContent = session.orh.toFixed(2);
  if (session.orl) document.getElementById('orl').textContent = session.orl.toFixed(2);
  if (session.vwap) document.getElementById('vwap').textContent = session.vwap.toFixed(2);

  // OR status
  const statusEl = document.getElementById('or-status');
  if (session.or_formed) {
    statusEl.textContent = 'Formed';
    statusEl.className = 'badge badge--formed';
    enableChecklist();
  }
}

function enableChecklist() {
  const btn  = document.getElementById('start-checklist-btn');
  const hint = document.getElementById('checklist-disabled-hint');
  btn.disabled = false;
  btn.onclick = () => { window.location.href = '/checklist.html'; };
  if (hint) hint.style.display = 'none';
}

async function loadMilestone() {
  const res  = await fetch('/api/stats');
  const data = await res.json();
  const { completed, required } = data.milestone;

  document.getElementById('milestone-count').textContent = completed;
  document.getElementById('milestone-bar').style.width   = `${Math.min((completed / required) * 100, 100)}%`;
  document.getElementById('milestone-nav').textContent   = `${completed}/20`;

  if (data.milestone.mcn_unlocked) {
    document.getElementById('milestone-hint').textContent = '🎉 MNQ unlocked!';
    const mnqNav = document.getElementById('mnq-nav-link');
    mnqNav.className = '';
    mnqNav.textContent = 'MNQ';
  }
}

// Classification save
document.getElementById('save-classification-btn')?.addEventListener('click', async () => {
  const val = document.getElementById('classification-select').value;
  if (!val) return;

  const tf = val === 'Aggressive' ? 15 : val === 'Defensive' ? 30 : null;

  await fetch(`/api/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ briefing_classification: val, or_timeframe: tf })
  });

  await loadSession();
});

// Manual OR entry
document.getElementById('manual-submit-btn')?.addEventListener('click', async () => {
  const orh  = parseFloat(document.getElementById('manual-orh').value);
  const orl  = parseFloat(document.getElementById('manual-orl').value);
  const vwap = parseFloat(document.getElementById('manual-vwap').value);

  if (!orh || !orl) {
    alert('ORH and ORL are required.');
    return;
  }

  await fetch(`/api/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orh, orl, vwap: vwap || null, or_formed: true })
  });

  document.getElementById('manual-entry').style.display = 'none';
  await loadSession();
});

// Sit Out override
document.getElementById('sitout-override-btn')?.addEventListener('click', () => {
  document.getElementById('sitout-warning').style.display = 'none';
});

// WebSocket: receive live OR data from TradingView webhook
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${window.location.host}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'or_formed') {
      renderSession(data.session);
    }
  };

  ws.onclose = () => setTimeout(connectWebSocket, 3000); // auto-reconnect
}

init();
