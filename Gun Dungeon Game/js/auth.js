// Authentication System
// Use same-origin in production, but fall back to the backend on localhost for local static dev servers.
const API_URL = (() => {
  const configuredBase = window.__API_BASE_URL__;
  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  const { protocol, hostname, port, origin } = window.location;
  const isLocalDevHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isNonBackendLocalPort = isLocalDevHost && port && port !== '3000';

  if (protocol === 'file:' || isNonBackendLocalPort) {
    return 'http://localhost:3000/api/auth';
  }

  return `${origin}/api/auth`;
})();
let authToken = localStorage.getItem('token');
let currentUser = null;

async function readApiResponse(response) {
  const raw = await response.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (_err) {
      if (raw.trim().startsWith('<')) {
        throw new Error('Server returned HTML instead of JSON. This is usually a deployment or proxy issue.');
      }
      throw new Error('Server returned an invalid response format.');
    }
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeAuth();
  setupAuthEventListeners();
});

function initializeAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    authToken = token;
    currentUser = JSON.parse(user);
    showStartScreen();
  } else {
    showLoginScreen();
  }
}

function setupAuthEventListeners() {
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  
  try {
    errorEl.textContent = '';
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await readApiResponse(response);

    // Save token and user data
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    // Reset form
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';

    // Show start screen
    showStartScreen();
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-confirm').value;
  const errorEl = document.getElementById('register-error');
  
  try {
    errorEl.textContent = '';

    if (password !== passwordConfirm) {
      throw new Error('Passwords do not match');
    }

    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password, passwordConfirm })
    });

    const data = await readApiResponse(response);

    // Save token and user data
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    // Reset form
    document.getElementById('register-username').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';

    // Show start screen
    showStartScreen();
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Reset game state if needed
  if (typeof state !== 'undefined') {
    state.paused = true;
  }
  
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('screen-register').classList.add('hidden');
  document.getElementById('screen-start').classList.add('hidden');
}

function showRegisterScreen() {
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-register').classList.remove('hidden');
  document.getElementById('screen-start').classList.add('hidden');
}

function showStartScreen() {
  loadUpgradesFromServer();  // refresh coins/upgrades display
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-register').classList.add('hidden');
  document.getElementById('screen-start').classList.remove('hidden');

  // Display user info
  if (currentUser) {
    const userInfo = document.getElementById('user-info');
    userInfo.innerHTML = `<p>Welcome, <span style="color: #ffd700;">${currentUser.username}</span>!</p><p>Level: <span style="color: #4f4;">${currentUser.level}</span> | Score: <span style="color: #f44;">${currentUser.score}</span></p><p style="color:#f5c842;">🪙 <span id="menu-coins">Loading...</span></p>`;
  }
}

function showLogin(e) {
  e.preventDefault();
  showLoginScreen();
}

function showRegister(e) {
  e.preventDefault();
  showRegisterScreen();
}

// Update user progress after game ends
async function updateUserProgress(score, level) {
  if (!authToken || !currentUser) return;
  
  try {
    const response = await fetch(`${API_URL}/update-progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ score, level })
    });

    const data = await readApiResponse(response);
    if (response.ok) {
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  } catch (error) {
    console.error('Failed to update progress:', error);
  }
}
