const tokenKey = 'iot_gdpr_token';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const meInfo = document.getElementById('meInfo');
const summaryOutput = document.getElementById('summaryOutput');
const adminControls = document.getElementById('adminControls');
const adminOutput = document.getElementById('adminOutput');

function getToken() {
  return localStorage.getItem(tokenKey);
}

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearToken() {
  localStorage.removeItem(tokenKey);
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function setUiAuthenticated(user) {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  meInfo.textContent = `Logged in as ${user.email} (${user.role})`;
  adminControls.classList.toggle('hidden', user.role !== 'admin');
}

function setUiLoggedOut() {
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(result.token);
    setUiAuthenticated(result.user);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken();
  setUiLoggedOut();
});

document.getElementById('loadSummaryBtn').addEventListener('click', async () => {
  try {
    const result = await api('/api/sensors/daily-summary');
    summaryOutput.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    alert(error.message);
  }
});

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
