let allData   = [];
let mnavChart  = null;
let priceChart = null;
let activeRange = 30;

const fmt = {
  usd:  v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  x:    v => Number(v).toFixed(2) + 'x',
  pct:  v => (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%',
  date: d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
};

async function loadData() {
  const res = await fetch(`data/data.json?t=${Math.floor(Date.now() / 60000)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  if (!json.records || json.records.length === 0) {
    throw new Error('data.json is empty — GitHub Actions has not run yet. Trigger it manually.');
  }

  return {
    meta: {
      updatedAt:   json.updatedAt,
      btcHeld:     json.btcHeld,
      sharesOut:   json.sharesOut,
      btcPerShare: json.btcPerShare,
    },
    records: json.records.map(r => ({
      date:        new Date(r.date),
      mstrClose:   r.mstrClose,
      btcClose:    r.btcClose,
      navPerShare: r.navPerShare,
      mnav:        r.mnav,
    })),
  };
}

function filterRange(records, days) {
  if (days === 'all') return records;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return records.filter(d => d.date >= cutoff);
}

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      labels: {
        color: '#7a94a8',
        font: { family: 'Space Mono', size: 11 },
        boxWidth: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#0d1117',
      borderColor: '#1e2a35',
      borderWidth: 1,
      titleColor: '#e8f0f7',
      bodyColor: '#7a94a8',
      titleFont: { family: 'Space Mono', size: 11 },
      bodyFont:  { family: 'Space Mono', size: 11 },
      padding: 12,
    },
  },
  scales: {
    x: {
      type: 'time',
      time: { unit: 'month' },
      grid:  { color: '#1e2a35' },
      ticks: { color: '#3d5060', font: { family: 'Space Mono', size: 10 } },
    },
  },
};

function buildMnavChart(records) {
  const ctx  = document.getElementById('mnavChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, 'rgba(247,147,26,0.25)');
  grad.addColorStop(1, 'rgba(247,147,26,0)');

  const cfg = {
    type: 'line',
    data: {
      datasets: [{
        label: 'mNAV Multiple',
        data:  records.map(d => ({ x: d.date, y: +d.mnav.toFixed(4) })),
        borderColor: '#f7931a',
        backgroundColor: grad,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#f7931a',
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: { label: ctx => ' mNAV: ' + ctx.parsed.y.toFixed(3) + 'x' },
        },
      },
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          grid:  { color: '#1e2a35' },
          ticks: {
            color: '#3d5060',
            font:  { family: 'Space Mono', size: 10 },
            callback: v => v.toFixed(1) + 'x',
          },
        },
      },
    },
  };

  if (mnavChart) mnavChart.destroy();
  mnavChart = new Chart(ctx, cfg);
}

function buildPriceChart(records) {
  const ctx      = document.getElementById('priceChart').getContext('2d');
  const baseMstr = records[0]?.mstrClose || 1;
  const baseBtc  = records[0]?.btcClose  || 1;

  const gradBtc  = ctx.createLinearGradient(0, 0, 0, 320);
  gradBtc.addColorStop(0, 'rgba(247,147,26,0.12)');
  gradBtc.addColorStop(1, 'rgba(247,147,26,0)');

  const gradMstr = ctx.createLinearGradient(0, 0, 0, 320);
  gradMstr.addColorStop(0, 'rgba(0,212,170,0.12)');
  gradMstr.addColorStop(1, 'rgba(0,212,170,0)');

  const cfg = {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'MSTR (normalized)',
          data:  records.map(d => ({ x: d.date, y: +(d.mstrClose / baseMstr * 100).toFixed(2) })),
          borderColor: '#00d4aa',
          backgroundColor: gradMstr,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3,
        },
        {
          label: 'BTC (normalized)',
          data:  records.map(d => ({ x: d.date, y: +(d.btcClose / baseBtc * 100).toFixed(2) })),
          borderColor: '#f7931a',
          backgroundColor: gradBtc,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}` },
        },
      },
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          grid:  { color: '#1e2a35' },
          ticks: { color: '#3d5060', font: { family: 'Space Mono', size: 10 }, callback: v => v.toFixed(0) },
        },
      },
    },
  };

  if (priceChart) priceChart.destroy();
  priceChart = new Chart(ctx, cfg);
}

function updateKPIs(records, meta) {
  if (!records.length) return;
  const latest = records[records.length - 1];
  const prev   = records[records.length - 2] || latest;

  const mstrChg = ((latest.mstrClose - prev.mstrClose) / prev.mstrClose) * 100;
  const btcChg  = ((latest.btcClose  - prev.btcClose)  / prev.btcClose)  * 100;

  document.getElementById('kpi-mnav').textContent = fmt.x(latest.mnav);
  document.getElementById('kpi-mstr').textContent = fmt.usd(latest.mstrClose);
  document.getElementById('kpi-btc').textContent  = fmt.usd(latest.btcClose);
  document.getElementById('kpi-nav').textContent  = fmt.usd(latest.navPerShare);

  const mstrEl = document.getElementById('kpi-mstr-change');
  mstrEl.textContent = fmt.pct(mstrChg) + ' (1d)';
  mstrEl.className   = 'kpi-sub ' + (mstrChg >= 0 ? 'up' : 'down');

  const btcEl = document.getElementById('kpi-btc-change');
  btcEl.textContent = fmt.pct(btcChg) + ' (1d)';
  btcEl.className   = 'kpi-sub ' + (btcChg >= 0 ? 'up' : 'down');

  document.getElementById('lastUpdated').textContent =
    'Updated: ' + fmt.date(latest.date);

  document.getElementById('btcHeld').textContent     = meta.btcHeld.toLocaleString() + ' BTC';
  document.getElementById('sharesOut').textContent   = (meta.sharesOut / 1e6).toFixed(0) + 'M shares';
  document.getElementById('btcPerShare').textContent = meta.btcPerShare.toFixed(5) + ' BTC';
}

function applyRange(days) {
  activeRange = days;
  const filtered = filterRange(allData, days);
  buildMnavChart(filtered);
  buildPriceChart(filtered);
}

document.querySelectorAll('.range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const val = btn.dataset.range;
    applyRange(val === 'all' ? 'all' : Number(val));
  });
});

async function init() {
  try {
    const { records, meta } = await loadData();
    allData = records;

    const filtered = filterRange(allData, activeRange);
    updateKPIs(allData, meta);
    buildMnavChart(filtered);
    buildPriceChart(filtered);

    document.getElementById('chartLoading').classList.add('hidden');
  } catch (err) {
    console.error('Data load error:', err);
    document.getElementById('chartLoading').innerHTML = `
      <div style="text-align:center;color:#ff4757;font-family:'Space Mono',monospace;font-size:0.78rem;padding:1.5rem;line-height:2">
        ⚠ ${err.message}<br>
        <span style="color:#7a94a8">Go to your GitHub repo →
        <strong style="color:#f7931a">Actions</strong> tab →
        click <strong style="color:#f7931a">Update mNAV Data</strong> →
        <strong style="color:#f7931a">Run workflow</strong></span>
      </div>`;
  }
}

init();
