// Checklist — Trading Trainer
// Manages sequential 8-step ORB Pullback checklist

const TOTAL_STEPS = 8;
let currentStep = 1;
let direction = null;
let sessionData = null;
let flags = []; // checklist steps that fired a warning

async function init() {
  const res = await fetch('/api/session/today');
  sessionData = await res.json();

  // Populate session context in the header
  if (sessionData.briefing_classification) {
    document.getElementById('session-classification').textContent = sessionData.briefing_classification;
  }
  if (sessionData.or_timeframe) {
    document.getElementById('or-timeframe-label').textContent = sessionData.or_timeframe;
    document.querySelectorAll('.or-tf').forEach(el => el.textContent = sessionData.or_timeframe);
  }
  if (sessionData.orh) document.getElementById('step-orh').textContent = sessionData.orh.toFixed(2);
  if (sessionData.orl) document.getElementById('step-orl').textContent = sessionData.orl.toFixed(2);
  if (sessionData.vwap) document.getElementById('step-vwap').textContent = sessionData.vwap.toFixed(2);

  showStep(1);
}

function showStep(n) {
  document.querySelectorAll('.checklist-step').forEach(el => el.classList.add('hidden'));
  document.getElementById(`step-${n}`)?.classList.remove('hidden');

  document.getElementById('current-step').textContent = n;
  const pct = ((n - 1) / TOTAL_STEPS) * 100;
  document.getElementById('progress-fill').style.width = `${pct}%`;
}

function stepConfirm(step, value) {
  if (step === 3) direction = value; // 'long' or 'short'
  goToStep(step + 1);
}

function stepFlag(step, reason) {
  flags.push(step);

  const messages = {
    heavy_volume: 'Volume on the pullback is heavy. This may indicate a reversal rather than a retest. Proceed only if you have additional confluence.',
    vwap_misaligned: `Price is not aligned with VWAP for a ${direction} trade. This reduces conviction. Proceed only if other conditions are very strong.`
  };

  if (confirm(`⚠️ ${messages[reason]}\n\nProceed anyway?`)) {
    goToStep(step + 1);
  }
  // If user cancels the confirm, they stay on the same step
}

function stepAbort(reason) {
  const titles = {
    news_event:      'Aborted — News Event',
    no_breakout:     'No Setup — No Breakout',
    invalid_pullback: 'Setup Invalid — Price Re-entered OR'
  };

  const messages = {
    news_event:       'A major economic event is scheduled within 60 minutes. This session has been logged as Invalid.',
    no_breakout:      'No breakout occurred from the opening range. This session has been logged as Invalid.',
    invalid_pullback: 'Price re-entered the opening range. The setup is invalidated and has been logged.'
  };

  document.getElementById('abort-title').textContent   = titles[reason]   || 'Setup Aborted';
  document.getElementById('abort-message').textContent = messages[reason] || 'This session has been logged.';

  document.querySelectorAll('.checklist-step').forEach(el => el.classList.add('hidden'));
  document.getElementById('step-abort').classList.remove('hidden');
  document.getElementById('progress-fill').style.width = '100%';

  // Log as Invalid
  logInvalidSetup(reason);
}

function stepWait(step) {
  alert('Wait for the candle to close, then return to confirm.');
}

function goToStep(n) {
  if (n > TOTAL_STEPS) return;
  currentStep = n;
  showStep(n);
}

async function logInvalidSetup(reason) {
  await fetch('/api/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionData?.id,
      instrument: 'MCL',
      strategy: 'ORB Pullback',
      outcome: 'Invalid',
      notes: `Abort reason: ${reason}`,
      checklist_flags: flags
    })
  }).catch(() => {}); // best-effort
}

// Step 8: R:R calculator and submit
['entry-price', 'stop-price', 'target-price'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateRR);
});

function updateRR() {
  const entry  = parseFloat(document.getElementById('entry-price').value);
  const stop   = parseFloat(document.getElementById('stop-price').value);
  const target = parseFloat(document.getElementById('target-price').value);

  if (!entry || !stop || !target) return;

  const risk   = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  const rr     = risk > 0 ? (reward / risk).toFixed(2) : 0;

  const rrDisplay = document.getElementById('rr-value');
  const rrWarning = document.getElementById('rr-warning');
  const submitBtn = document.getElementById('submit-setup-btn');

  rrDisplay.textContent = `1 : ${rr}`;

  if (parseFloat(rr) >= 2) {
    rrDisplay.style.color = 'var(--color-success)';
    rrWarning.style.display = 'none';
    submitBtn.disabled = false;
  } else {
    rrDisplay.style.color = 'var(--color-danger)';
    rrWarning.style.display = 'block';
    submitBtn.disabled = true;
  }
}

document.getElementById('submit-setup-btn')?.addEventListener('click', async () => {
  const entry  = parseFloat(document.getElementById('entry-price').value);
  const stop   = parseFloat(document.getElementById('stop-price').value);
  const target = parseFloat(document.getElementById('target-price').value);
  const grade  = document.getElementById('setup-grade').value;
  const notes  = document.getElementById('setup-notes').value;

  const orRangeSize = sessionData?.orh && sessionData?.orl
    ? parseFloat((sessionData.orh - sessionData.orl).toFixed(2))
    : null;

  const res = await fetch('/api/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionData?.id,
      instrument: 'MCL',
      strategy: 'ORB Pullback',
      direction: direction === 'long' ? 'Long' : 'Short',
      entry_price: entry,
      stop_price: stop,
      target_price: target,
      or_range_size: orRangeSize,
      checklist_flags: flags,
      setup_grade: grade || null,
      notes: notes || null
    })
  });

  if (res.ok) {
    document.getElementById('progress-fill').style.width = '100%';
    document.querySelectorAll('.checklist-step').forEach(el => el.classList.add('hidden'));
    document.getElementById('step-abort').classList.remove('hidden');
    document.getElementById('abort-title').textContent   = '✓ Setup Logged';
    document.getElementById('abort-message').textContent = 'Your setup is open. Return here after the trade closes to log the outcome.';
  } else {
    const err = await res.json();
    alert(`Error: ${err.error}`);
  }
});

init();
