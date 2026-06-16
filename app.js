// app.js - vanilla JS dashboard (login, JWT, polling /api/telemetry, chart, device-token)
// Place at repo root and referenced by index.html

// CONFIG
const API_BASE = 'gdprapi-dwdehpbzaedrbdcj.eastasia-01.azurewebsites.net'; // if backend on other host, set e.g. 'https://api.example.com'
const TELEMETRY_URL = `${API_BASE}/api/telemetry?limit=40`;
const AUTH_LOGIN = `${API_BASE}/api/auth/login`;
const AUTH_ME = `${API_BASE}/api/auth/me`;
const TOKEN_ENDPOINT = `${API_BASE}/api/telemetry/token`;
const POLL_MS = 5000;
const TOKEN_KEY = 'iot_gdpr_token';

// DOM refs
const loginForm = document.getElementById('loginForm');
const authArea = document.getElementById('authArea');
const refreshBtn = document.getElementById('refreshBtn');
const lastUpdated = document.getElementById('lastUpdated');

const vTemp = document.getElementById('v-temperature');
const vHum = document.getElementById('v-humidity');
const vMotion = document.getElementById('v-motion');
const vDist = document.getElementById('v-distance');
const vLight = document.getElementById('v-light');

const sTemp = document.querySelector('#s-temperature .status-text');
const sHum = document.querySelector('#s-humidity .status-text');
const sMotion = document.querySelector('#s-motion .status-text');
const sDist = document.querySelector('#s-distance .status-text');
const sLight = document.querySelector('#s-light .status-text');

const dtBroker = document.getElementById('dtBroker');
const dtTopic = document.getElementById('dtTopic');
const dtToken = document.getElementById('dtToken');
const copyTokenBtn = document.getElementById('copyToken');
const rotateTokenBtn = document.getElementById('rotateToken');

const tableBody = document.getElementById('tableBody');

let combinedChart = null;
let polling = null;
let latestRecords = [];

// AUTH helpers
function getToken(){ return localStorage.getItem(TOKEN_KEY); }
function setToken(t){ localStorage.setItem(TOKEN_KEY, t); }
function clearToken(){ localStorage.removeItem(TOKEN_KEY); }

// UTIL
function formatTime(ts){
  if(!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch(e){ return String(ts); }
}

// Show login or user (check /api/auth/me)
async function initAuth(){
  const t = getToken();
  if(!t){
    showLogin();
    return;
  }
  try {
    const res = await fetch(AUTH_ME, { headers: { 'Authorization': `Bearer ${t}` }});
    if(!res.ok) { clearToken(); showLogin(); return; }
    const json = await res.json();
    showUser(json.user);
  } catch(e){
    console.warn('auth check failed', e);
    clearToken();
    showLogin();
  }
}

function showLogin(){
  authArea.innerHTML = '';
  authArea.appendChild(loginForm);
  loginForm.style.display = 'flex';
}

function showUser(user){
  loginForm.style.display = 'none';
  authArea.innerHTML = `
    <div class="user-info">
      <span style="margin-right:12px">${user?.email || user?.name || 'user'}</span>
      <button id="logoutBtnLocal" class="btn">Logout</button>
    </div>
  `;
  document.getElementById('logoutBtnLocal').addEventListener('click', () => {
    clearToken();
    initAuth();
  });
}

// LOGIN
loginForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if(!email || !password) return alert('Fill email and password');

  try {
    const res = await fetch(AUTH_LOGIN, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password })
    });
    if(!res.ok){
      const txt = await res.text();
      throw new Error(txt || `Login failed (${res.status})`);
    }
    const json = await res.json();
    if(json.token) setToken(json.token);
    await initAuth();
    await loadDeviceToken();
    await loadTelemetry();
  } catch(err){
    alert('Login error: ' + (err.message || err));
    console.error(err);
  }
});

// API wrapper (adds Authorization if token)
async function apiFetch(path, opts = {}) {
  const headers = (opts.headers ? {...opts.headers} : {});
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  return res;
}

// LOAD telemetry
async function loadTelemetry(){
  try {
    const res = await apiFetch(TELEMETRY_URL);
    if(res.status === 401){
      // need login
      latestRecords = [];
      renderNoData();
      return;
    }
    const json = await res.json();
    const recs = Array.isArray(json.records) ? json.records : (Array.isArray(json) ? json : []);
    latestRecords = recs;
    renderTelemetry(recs);
  } catch(e){
    console.error('loadTelemetry', e);
  }
}

// RENDER metrics, chart, table
function renderTelemetry(records){
  const latest = (records && records.length) ? records[0] : null;

  vTemp.textContent = latest && typeof latest.temperature === 'number' ? latest.temperature.toFixed(1) + '°C' : '--';
  vHum.textContent = latest && typeof latest.humidity === 'number' ? Math.round(latest.humidity) + '%' : '--';
  vMotion.textContent = latest ? (latest.motion ? 'Detected' : 'No') : '--';
  vDist.textContent = latest && typeof latest.distance === 'number' ? latest.distance.toFixed(1) + ' cm' : '--';
  vLight.textContent = latest && typeof latest.light === 'number' ? latest.light + ' lx' : '--';

  sTemp.textContent = (latest && typeof latest.temperature === 'number') ? (latest.temperature > 60 ? 'Critical' : (latest.temperature > 45 ? 'High' : 'Normal')) : '—';
  sHum.textContent = (latest && typeof latest.humidity === 'number') ? 'Normal' : '—';
  sMotion.textContent = latest ? (latest.motion ? 'Detected' : 'No motion') : '—';
  sDist.textContent = (latest && typeof latest.distance === 'number') ? 'OK' : '—';
  sLight.textContent = (latest && typeof latest.light === 'number') ? 'OK' : '—';

  lastUpdated.textContent = records.length ? `Updated ${new Date().toLocaleTimeString()}` : 'No data';

  renderCombinedChart(records);
  renderTable(records);
}

function renderNoData(){
  vTemp.textContent = vHum.textContent = vMotion.textContent = vDist.textContent = vLight.textContent = '--';
  lastUpdated.textContent = 'No data';
  tableBody.innerHTML = `<tr><td colspan="7" class="muted">No telemetry yet.</td></tr>`;
  if(combinedChart){ combinedChart.data.labels = []; combinedChart.data.datasets.forEach(ds => ds.data = []); combinedChart.update(); }
}

// Chart.js rendering
function renderCombinedChart(records){
  const ctx = document.getElementById('combinedChart').getContext('2d');
  const ordered = [...records].reverse();
  const labels = ordered.map(r => r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : (r.timestampMillis ? new Date(r.timestampMillis).toLocaleTimeString() : ''));

  const tempData = ordered.map(r => (typeof r.temperature === 'number' ? r.temperature : null));
  const humData = ordered.map(r => (typeof r.humidity === 'number' ? r.humidity : null));
  const distData = ordered.map(r => (typeof r.distance === 'number' ? r.distance : null));
  const lightData = ordered.map(r => (typeof r.light === 'number' ? r.light : null));

  const datasets = [
    { label: 'Temperature', data: tempData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension:0.3, spanGaps:true },
    { label: 'Humidity', data: humData, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.06)', tension:0.3, spanGaps:true },
    { label: 'Distance', data: distData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.06)', tension:0.3, spanGaps:true },
    { label: 'Light', data: lightData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.06)', tension:0.3, spanGaps:true }
  ];

  if(combinedChart){ combinedChart.destroy(); combinedChart = null; }

  combinedChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ color:'#cbd5e1' } }, tooltip:{ mode:'index', intersect:false } },
      scales:{ x:{ ticks:{ color:'#9ca3af' }, grid:{ color:'rgba(255,255,255,0.02)' } }, y:{ ticks:{ color:'#9ca3af' }, grid:{ color:'rgba(255,255,255,0.02)' } } }
    }
  });
}

// table render
function renderTable(records){
  if(!records || records.length === 0){
    tableBody.innerHTML = `<tr><td colspan="7" class="muted">No telemetry yet.</td></tr>`;
    return;
  }
  const rows = records.map(r => {
    const t = r.timestamp ? formatTime(r.timestamp) : (r.timestampMillis ? formatTime(r.timestampMillis) : '—');
    const dev = r.deviceId || '—';
    const temp = typeof r.temperature === 'number' ? `${r.temperature} °C` : '—';
    const hum = typeof r.humidity === 'number' ? `${r.humidity} %` : '—';
    const motion = (r.motion === 1 || r.motion === true) ? 'Detected' : 'No';
    const dist = typeof r.distance === 'number' ? `${r.distance} cm` : '—';
    const light = typeof r.light === 'number' ? `${r.light}` : '—';
    return `<tr><td>${t}</td><td>${dev}</td><td>${temp}</td><td>${hum}</td><td>${motion}</td><td>${dist}</td><td>${light}</td></tr>`;
  }).join('');
  tableBody.innerHTML = rows;
}

// Device token management
async function loadDeviceToken(){
  try {
    const res = await apiFetch(TOKEN_ENDPOINT);
    if(!res.ok){ dtBroker.textContent='—'; dtTopic.textContent='—'; dtToken.value = '—'; return; }
    const json = await res.json();
    dtBroker.textContent = json.mqttBroker || '—';
    dtTopic.textContent = json.mqttTopic || '—';
    dtToken.value = json.deviceToken || '—';
  } catch(e){
    console.warn('loadDeviceToken', e);
  }
}

copyTokenBtn && copyTokenBtn.addEventListener('click', () => {
  const t = dtToken.value || '';
  if(t && t !== '—') navigator.clipboard.writeText(t).then(()=> alert('Token copied'));
});

rotateTokenBtn && rotateTokenBtn.addEventListener('click', async () => {
  try {
    const res = await apiFetch(TOKEN_ENDPOINT, { method:'POST' });
    if(!res.ok) throw new Error('Rotate failed');
    const json = await res.json();
    dtToken.value = json.deviceToken || '—';
  } catch(e){
    alert('Rotate failed: ' + (e.message || e));
  }
});

// API wrapper used above
async function apiFetch(path, opts = {}) {
  const headers = (opts.headers ? {...opts.headers} : {});
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  return res;
}

// UI actions
refreshBtn.addEventListener('click', () => loadTelemetry());

// Polling
function startPolling(){
  if(polling) clearInterval(polling);
  loadTelemetry();
  polling = setInterval(loadTelemetry, POLL_MS);
}

// INIT
(async function boot(){
  initAuth();
  await loadDeviceToken();
  startPolling();
})();
