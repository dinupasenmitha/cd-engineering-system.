/* =========================================================
   CD Engineering — App Router & Initialization (v3.0)
   ========================================================= */
window.APP = window.APP || {};

// ── Toast Notification ────────────────────────────────────
APP.toast = function (message, type) {
  type = type || 'success';
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icon = type === 'error' ? '✕' : type === 'info' ? 'ℹ' : '✓';
  toast.innerHTML = `<span style="font-size:16px;font-weight:700">${icon}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3000);
};

// ── Styled Confirmation Modal ─────────────────────────────
APP.confirm = function (opts) {
  const iconMap = {
    warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };
  const type = opts.type || 'warn';
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <div class="confirm-dialog-body">
        <div class="confirm-dialog-icon ${type}">${iconMap[type]}</div>
        <h3>${opts.title || 'Are you sure?'}</h3>
        <p>${opts.message || ''}</p>
      </div>
      <div class="confirm-dialog-footer">
        <button class="btn btn-outline" id="confirmCancel">${opts.cancelText || 'Cancel'}</button>
        <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${opts.confirmText || 'Confirm'}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#confirmCancel').onclick = () => overlay.remove();
  overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); if (opts.onConfirm) opts.onConfirm(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
};

// ── Count-Up Animation ────────────────────────────────────
APP.countUp = function (el, target, duration) {
  duration = duration || 800;
  const startTime = performance.now();
  const isCurrency = typeof target === 'string' && target.includes('Rs.');
  let numericTarget = isCurrency ? parseFloat(target.replace(/[^0-9.]/g, '')) : parseFloat(target);
  if (isNaN(numericTarget) || numericTarget === 0) { el.textContent = target; return; }
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = numericTarget * eased;
    if (isCurrency) { el.textContent = 'Rs. ' + current.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    else if (Number.isInteger(numericTarget)) { el.textContent = Math.round(current).toString(); }
    else { el.textContent = current.toFixed(2); }
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
};

// ── Authentication Module ─────────────────────────────────
APP.Auth = (function () {
  let currentUser = null;
  let inactivityTimer = null;
  const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes

  function getUser() { return currentUser; }
  function isAdmin() { return currentUser && currentUser.role === 'admin'; }
  function isLoggedIn() { return currentUser !== null; }

  function showLogin(message) {
    currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display = 'none';
    const errEl = document.getElementById('login-error');
    if (message) { errEl.textContent = message; errEl.style.display = 'block'; }
    else { errEl.style.display = 'none'; }
    document.getElementById('login-username').focus();
    stopInactivityTimer();
  }

  function hideLogin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    startInactivityTimer();
  }

  async function checkSession() {
    try {
      const resp = await fetch('/api/auth/me');
      if (resp.ok) {
        const data = await resp.json();
        currentUser = data.user;
        return true;
      }
    } catch (e) {}
    return false;
  }

  async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    if (!username || !password) { errEl.textContent = 'Please enter username and password'; errEl.style.display = 'block'; return; }

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (resp.ok) {
        currentUser = data.user;
        document.getElementById('login-password').value = '';
        hideLogin();
        updateUserUI();
        await APP.Store.loadAll();
        APP.Router.init();
      } else {
        errEl.textContent = data.error || 'Login failed';
        errEl.style.display = 'block';
      }
    } catch (e) {
      errEl.textContent = 'Cannot connect to server';
      errEl.style.display = 'block';
    }
  }

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    currentUser = null;
    showLogin();
  }

  function updateUserUI() {
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-role-badge');
    if (nameEl && currentUser) nameEl.textContent = currentUser.displayName;
    if (roleEl && currentUser) {
      roleEl.textContent = currentUser.role === 'admin' ? 'Admin' : 'Staff';
      roleEl.className = 'role-badge ' + (currentUser.role === 'admin' ? 'role-admin' : 'role-staff');
    }
  }

  // ── Inactivity Timer ────────────────────────────────────
  function startInactivityTimer() {
    resetInactivityTimer();
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetInactivityTimer, { passive: true });
    });
  }

  function stopInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
      document.removeEventListener(evt, resetInactivityTimer);
    });
  }

  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      APP.toast('Session expired due to inactivity', 'info');
      logout();
    }, INACTIVITY_TIMEOUT);
  }

  return { getUser, isAdmin, isLoggedIn, showLogin, hideLogin, checkSession, login, logout, updateUserUI };
})();

// ── Dark Mode ─────────────────────────────────────────────
APP.DarkMode = (function () {
  function init() {
    const saved = localStorage.getItem('cd_dark_mode');
    if (saved === 'true') document.documentElement.setAttribute('data-theme', 'dark');
    updateLabel();
    const btn = document.getElementById('darkToggle');
    if (btn) btn.addEventListener('click', toggle);
  }
  function toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('cd_dark_mode', 'false'); }
    else { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('cd_dark_mode', 'true'); }
    updateLabel();
  }
  function updateLabel() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const label = document.getElementById('darkLabel');
    if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }
  return { init };
})();

// ── Responsive Sidebar ────────────────────────────────────
APP.Sidebar = (function () {
  function init() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (toggle) toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); backdrop.classList.toggle('active'); });
    if (backdrop) backdrop.addEventListener('click', () => close());
  }
  function close() {
    const s = document.getElementById('sidebar');
    const b = document.getElementById('sidebarBackdrop');
    if (s) s.classList.remove('open');
    if (b) b.classList.remove('active');
  }
  return { init, close };
})();

// ── Router ────────────────────────────────────────────────
APP.Router = (function () {
  let initialized = false;
  const pages = {
    dashboard: APP.Dashboard, customers: APP.Customers, jobs: APP.Jobs,
    pricing: APP.Pricing, invoices: APP.Invoices, technicians: APP.Technicians, settings: APP.Settings,
    fleet: APP.Fleet, catalog: APP.Catalog, documents: APP.Documents,
  };

  function navigate(page, action, id) {
    let hash = '#' + page;
    if (action) hash += '/' + action;
    if (id) hash += '/' + id;
    window.location.hash = hash;
  }

  function handleRoute() {
    if (!APP.Auth.isLoggedIn()) return;
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const parts = hash.split('/');
    const page = parts[0], action = parts[1] || null, id = parts[2] || null;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    APP.Sidebar.close();
    const module = pages[page];
    if (module && module.render) module.render(action, id);
    else if (pages.dashboard) pages.dashboard.render();
  }

  function init() {
    if (!initialized) {
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.page));
      });
      window.addEventListener('hashchange', handleRoute);
      initialized = true;
    }
    handleRoute();
  }

  return { navigate, init };
})();

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  APP.DarkMode.init();
  APP.Sidebar.init();

  // Bind login form
  document.getElementById('login-btn').addEventListener('click', APP.Auth.login);
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') APP.Auth.login(); });
  document.getElementById('login-username').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-password').focus(); });
  document.getElementById('logout-btn').addEventListener('click', () => APP.Auth.logout());

  // Check existing session
  const hasSession = await APP.Auth.checkSession();
  if (hasSession) {
    APP.Auth.hideLogin();
    APP.Auth.updateUserUI();
    await APP.Store.loadAll();
    APP.Router.init();
  } else {
    APP.Auth.showLogin();
  }
});
