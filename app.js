const tokenKey = 'iot_gdpr_token';
const apiBaseKey = 'iot_gdpr_api_base';

// Nếu bạn có App Service API, điền vào đây (ví dụ: https://iotgdpr-api.azurewebsites.net)
// Để rỗng thì:
// - local => dùng /api
// - azurestaticapps => vẫn dùng /api (sẽ lỗi nếu không có SWA Functions)
const DEFAULT_CLOUD_API_BASE = '';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const meInfo = document.getElementById('meInfo');
const adminControls = document.getElementById('adminControls');
const adminOutput = document.getElementById('adminOutput');
const kpiCards = document.getElementById('kpiCards');
const chartsSection = document.getElementById('chartsSection');
const emptyState = document.getElementById('emptyState');
const summaryPrompt = document.getElementById('summaryPrompt');

// Chart instances (so we can destroy/re-create on refresh)
let chartTemp = null;
let chartHR = null;
let chartSpo2 = null;

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

function getApiBase() {
  const fromStorage = (localStorage.getItem(apiBaseKey) || '').trim();
  if (fromStorage) return fromStorage.replace(/\/+$/, '');

  // Nếu chạy trên SWA domain mà có backend rời, bạn nên set DEFAULT_CLOUD_API_BASE
  if (window.location.hostname.includes('azurestaticapps.net')) {
    return DEFAULT_CLOUD_API_BASE.replace(/\/+$/, '');
  }

  // local/dev mặc định dùng same-origin
  return '';
}

function buildApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = buildApiUrl(path);
  const response = await fetch(url, { ...options, headers });

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.error('Failed to parse API response JSON', error, { url, status: response.status, raw });
      throw new Error(`API trả về dữ liệu không phải JSON (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed: ${response.status}`;
    throw new Error(msg);
  }

  return data ?? {};
}

function setUiAuthenticated(user) {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  meInfo.textContent = `${user.email}  •  ${user.role}`;
  adminControls.classList.toggle('hidden', user.role !== 'admin');
}

function setUiLoggedOut() {
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  // Reset dashboard state for next login
  kpiCards.classList.add('hidden');
  chartsSection.classList.add('hidden');
  emptyState.classList.add('hidden');
  summaryPrompt.classList.remove('hidden');
  kpiCards.innerHTML = '';
  destroyCharts();
}

// ── Chart helpers ────────────────────────────────────────────

function destroyCharts() {
  if (chartTemp)  { chartTemp.destroy();  chartTemp = null; }
  if (chartHR)    { chartHR.destroy();    chartHR = null; }
  if (chartSpo2)  { chartSpo2.destroy();  chartSpo2 = null; }
}

/* Build a gauge-style doughnut chart for a single average value */
function buildGauge(canvasId, value, max, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const filled = value !== null ? Math.min(value, max) : 0;
  const remaining = max - filled;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [filled, remaining],
        backgroundColor: [color, '#e0e7ff'],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      animation: { animateRotate: true, duration: 800 }
    }
  });
}

/* Render KPI cards and charts from the summaries array */
function renderSummaryUI(day, summaries) {
  // Aggregate across all users visible to the requester
  let totalCount = 0;
  let tempSum = 0, tempN = 0;
  let hrSum = 0, hrN = 0;
  let spo2Sum = 0, spo2N = 0;

  summaries.forEach(({ summary }) => {
    totalCount += summary.count || 0;
    if (summary.averages.temperature !== null) {
      tempSum += summary.averages.temperature;
      tempN++;
    }
    if (summary.averages.heartRate !== null) {
      hrSum += summary.averages.heartRate;
      hrN++;
    }
    if (summary.averages.spo2 !== null) {
      spo2Sum += summary.averages.spo2;
      spo2N++;
    }
  });

  const avgTemp = tempN ? (tempSum / tempN).toFixed(1) : null;
  const avgHR = hrN ? (hrSum / hrN).toFixed(0) : null;
  const avgSpo2 = spo2N ? (spo2Sum / spo2N).toFixed(1) : null;

  // Hide prompt, show appropriate sections
  summaryPrompt.classList.add('hidden');

  if (totalCount === 0) {
    emptyState.classList.remove('hidden');
    chartsSection.classList.add('hidden');
    kpiCards.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Build KPI cards
  kpiCards.innerHTML = `
    <div class="kpi-card count">
      <span class="kpi-icon">📋</span>
      <span class="kpi-label">Records today</span>
      <span class="kpi-value">${totalCount}</span>
      <span class="kpi-unit">${day}</span>
    </div>
    <div class="kpi-card temp">
      <span class="kpi-icon">🌡</span>
      <span class="kpi-label">Avg Temperature</span>
      ${avgTemp !== null
        ? `<span class="kpi-value">${avgTemp}<small style="font-size:1rem"> °C</small></span>`
        : `<span class="kpi-null">—</span>`}
    </div>
    <div class="kpi-card hr">
      <span class="kpi-icon">💓</span>
      <span class="kpi-label">Avg Heart Rate</span>
      ${avgHR !== null
        ? `<span class="kpi-value">${avgHR}<small style="font-size:1rem"> bpm</small></span>`
        : `<span class="kpi-null">—</span>`}
    </div>
    <div class="kpi-card spo2">
      <span class="kpi-icon">🩸</span>
      <span class="kpi-label">Avg SpO2</span>
      ${avgSpo2 !== null
        ? `<span class="kpi-value">${avgSpo2}<small style="font-size:1rem"> %</small></span>`
        : `<span class="kpi-null">—</span>`}
    </div>
  `;
  kpiCards.classList.remove('hidden');

  // Build gauge charts
  chartsSection.classList.remove('hidden');
  destroyCharts();
  // Temp gauge: 0–45 °C range
  chartTemp = buildGauge('chartTemp', avgTemp !== null ? parseFloat(avgTemp) : null, 45, '#f59e0b');
  // Heart rate gauge: 0–200 bpm range
  chartHR = buildGauge('chartHR', avgHR !== null ? parseFloat(avgHR) : null, 200, '#ef4444');
  // SpO2 gauge: 0–100 % range
  chartSpo2 = buildGauge('chartSpo2', avgSpo2 !== null ? parseFloat(avgSpo2) : null, 100, '#06b6d4');
}

// ── Event listeners ──────────────────────────────────────────

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(result.token);
    setUiAuthenticated(result.user);
  } catch (error) {
    alert(error.message);
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken();
  setUiLoggedOut();
});

async function loadSummary() {
  try {
    const result = await api('/api/sensors/daily-summary');
    renderSummaryUI(result.day, result.summaries);
  } catch (error) {
    alert(error.message);
  }
}

document.getElementById('loadSummaryBtn').addEventListener('click', loadSummary);
document.getElementById('loadSummaryBtnEmpty').addEventListener('click', loadSummary);
document.getElementById('loadSummaryBtnPrompt').addEventListener('click', loadSummary);

document.getElementById('listUsersBtn').addEventListener('click', async () => {
  try {
    const result = await api('/api/users');
    adminOutput.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('sendDailyEmailsBtn').addEventListener('click', async () => {
  try {
    const result = await api('/api/admin/send-daily-emails', { method: 'POST' });
    adminOutput.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    alert(error.message);
  }
});

(async function bootstrap() {
  const token = getToken();
  if (!token) {
    setUiLoggedOut();
    return;
  }

  try {
    const result = await api('/api/auth/me');
    setUiAuthenticated(result.user);
  } catch (_error) {
    clearToken();
    setUiLoggedOut();
  }
})();
