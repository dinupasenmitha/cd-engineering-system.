/* =========================================================
   CD Engineering — Settings Module (v3.0)
   ========================================================= */
window.APP = window.APP || {};

APP.Settings = (function () {
  const S = () => APP.Store;
  const isAdmin = () => APP.Auth.isAdmin();

  function render() {
    const stats = S().getStats();
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <h1>Settings</h1>
          <p>Manage application data, users, and preferences</p>
        </div>

        <!-- Data Summary -->
        <div class="card mb-20">
          <div class="card-header"><h3>Data Summary</h3></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;text-align:center">
              <div><div style="font-size:28px;font-weight:700;color:var(--primary-500)">${stats.totalCustomers}</div><div style="font-size:12px;color:var(--gray-500);margin-top:4px">Customers</div></div>
              <div><div style="font-size:28px;font-weight:700;color:var(--primary-500)">${stats.totalJobs}</div><div style="font-size:12px;color:var(--gray-500);margin-top:4px">Jobs</div></div>
              <div><div style="font-size:28px;font-weight:700;color:var(--primary-500)">${stats.totalInvoices}</div><div style="font-size:12px;color:var(--gray-500);margin-top:4px">Invoices</div></div>
              <div><div style="font-size:28px;font-weight:700;color:var(--primary-500)">${stats.totalTechnicians}</div><div style="font-size:12px;color:var(--gray-500);margin-top:4px">Technicians</div></div>
              ${isAdmin() ? `<div><div style="font-size:28px;font-weight:700;color:var(--success)">${S().formatCurrency(stats.totalRevenue)}</div><div style="font-size:12px;color:var(--gray-500);margin-top:4px">Total Revenue</div></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Data Management -->
        <div class="settings-grid">
          <div class="card settings-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div class="kpi-icon blue" style="width:40px;height:40px;border-radius:10px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <div><h4>Export Data</h4></div>
            </div>
            <p>Download all your business data as a JSON backup file.</p>
            <button class="btn btn-primary" onclick="APP.Settings.exportData()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Backup
            </button>
          </div>

          ${isAdmin() ? `
          <div class="card settings-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div class="kpi-icon green" style="width:40px;height:40px;border-radius:10px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div><h4>Import Data</h4></div>
            </div>
            <p>Restore data from a JSON backup. <strong>Admin only.</strong></p>
            <div class="file-input-wrap">
              <button class="btn btn-outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Choose File & Import
              </button>
              <input type="file" accept=".json" onchange="APP.Settings.importData(event)">
            </div>
          </div>

          <div class="card settings-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div class="kpi-icon amber" style="width:40px;height:40px;border-radius:10px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              </div>
              <div><h4>Reset to Demo Data</h4></div>
            </div>
            <p>Reset the system to demo data. <strong>Admin only.</strong></p>
            <button class="btn btn-outline" style="border-color:var(--warning);color:var(--warning)" onclick="APP.Settings.resetData()">
              Reset All Data
            </button>
          </div>

          <div class="card settings-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div class="kpi-icon purple" style="width:40px;height:40px;border-radius:10px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div><h4>Server Backup</h4></div>
            </div>
            <p>Create a server-side backup and view existing backups. <strong>Admin only.</strong></p>
            <button class="btn btn-primary" onclick="APP.Settings.createServerBackup()" style="margin-bottom:8px">Create Backup Now</button>
            <button class="btn btn-outline" onclick="APP.Settings.showBackups()">View Backups</button>
          </div>
          ` : `
          <div class="card settings-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
              <div class="kpi-icon purple" style="width:40px;height:40px;border-radius:10px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </div>
              <div><h4>About</h4></div>
            </div>
            <p><strong>CD Engineering Management System</strong><br>Version 3.0<br><br>Contact your administrator for data management tasks.</p>
          </div>
          `}
        </div>

        ${isAdmin() ? `
        <!-- User Management (Admin Only) -->
        <div class="card mt-20">
          <div class="card-header">
            <h3>User Management</h3>
            <button class="btn btn-primary btn-sm" onclick="APP.Settings.showUserModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add User
            </button>
          </div>
          <div class="card-body compact">
            <div id="userTableWrap">Loading...</div>
          </div>
        </div>

        <!-- About -->
        <div class="card mt-20">
          <div class="card-body">
            <p style="font-size:13px;color:var(--gray-500)"><strong>CD Engineering Management System</strong> — Version 3.0<br>
            Built for CD Engineering Enterprises (PVT) Ltd. Air Conditioning Business Management.<br>
            Database: SQLite • Server: Node.js/Express • Auto-backup: Enabled (daily)</p>
          </div>
        </div>
        ` : ''}
      </div>`;

    if (isAdmin()) loadUsers();
  }

  async function loadUsers() {
    try {
      const resp = await fetch('/api/users');
      if (!resp.ok) return;
      const users = await resp.json();
      const wrap = document.getElementById('userTableWrap');
      if (!wrap) return;
      const currentUserId = APP.Auth.getUser().id;
      const rows = users.map(u => `
        <tr>
          <td><strong>${u.display_name}</strong></td>
          <td>${u.username}</td>
          <td><span class="role-badge ${u.role === 'admin' ? 'role-admin' : 'role-staff'}" style="color:${u.role==='admin'?'var(--success)':'var(--info)'}">${u.role}</span></td>
          <td>${S().formatDate(u.created_at)}</td>
          <td>
            <button class="btn btn-outline btn-xs" onclick="APP.Settings.showPasswordModal('${u.id}','${u.display_name}')">Change Password</button>
            ${u.id !== currentUserId ? `<button class="btn-icon" title="Delete" onclick="APP.Settings.deleteUser('${u.id}','${u.display_name}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : '<span class="text-muted" style="font-size:11px">(You)</span>'}
          </td>
        </tr>`).join('');
      wrap.innerHTML = `<table class="data-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Created</th><th style="width:200px">Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (e) { console.error('Failed to load users', e); }
  }

  async function exportData() {
    try {
      const resp = await fetch('/api/backup/export');
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cd_engineering_backup_' + new Date().toISOString().split('T')[0] + '.json';
      a.click();
      URL.revokeObjectURL(url);
      APP.toast('Data exported successfully');
    } catch (e) { APP.toast(e.message || 'Export failed', 'error'); }
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    APP.confirm({
      title: 'Import Data?',
      message: 'This will replace ALL current data. This cannot be undone.',
      type: 'warn', confirmText: 'Import',
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            const resp = await fetch('/api/backup/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (resp.ok) { APP.toast('Data imported! Reloading...'); await APP.Store.loadAll(); setTimeout(() => render(), 500); }
            else { const err = await resp.json(); APP.toast(err.error || 'Import failed', 'error'); }
          } catch (err) { APP.toast('Failed to parse file', 'error'); }
        };
        reader.readAsText(file);
      }
    });
  }

  function resetData() {
    APP.confirm({
      title: 'Reset All Data?',
      message: 'This will erase all data and restore demo records. This cannot be undone.',
      type: 'danger', confirmText: 'Reset Everything',
      onConfirm: async () => {
        try {
          // Delete all and re-seed
          const resp = await fetch('/api/backup/reset-demo', { method: 'POST' });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: 'Reset failed' }));
            throw new Error(err.error || 'Reset failed');
          }
          APP.toast('Resetting... Please wait');
          setTimeout(() => location.reload(), 1500);
        } catch (e) { APP.toast(e.message || 'Reset failed', 'error'); }
      }
    });
  }

  async function createServerBackup() {
    try {
      const resp = await fetch('/api/backup/create', { method: 'POST' });
      const data = await resp.json();
      APP.toast(`Backup created: ${data.filename}`);
    } catch (e) { APP.toast('Backup failed', 'error'); }
  }

  async function showBackups() {
    try {
      const resp = await fetch('/api/backup/list');
      const backups = await resp.json();
      const list = backups.length ? backups.map(b => `<li style="padding:6px 0;border-bottom:1px solid var(--gray-100)"><strong>${b.filename}</strong> — ${(b.size / 1024).toFixed(1)} KB — ${S().formatDate(b.createdAt)}</li>`).join('') : '<li>No backups found</li>';
      APP.confirm({ title: 'Server Backups', message: `<ul style="text-align:left;list-style:none;padding:0;max-height:300px;overflow-y:auto;font-size:13px">${list}</ul>`, type: 'info', confirmText: 'Close', cancelText: '' });
    } catch (e) { APP.toast('Failed to load backups', 'error'); }
  }

  function showUserModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'userModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header"><h3>Add User</h3><button class="modal-close" onclick="document.getElementById('userModal').remove()">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Display Name *</label><input class="form-control" id="newUserName" placeholder="Full name"></div>
          <div class="form-group"><label>Username *</label><input class="form-control" id="newUserUsername" placeholder="Login username"></div>
          <div class="form-group"><label>Password *</label><input class="form-control" type="password" id="newUserPassword" placeholder="Min 8 characters"></div>
          <div class="form-group"><label>Role *</label><select class="form-control" id="newUserRole"><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('userModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Settings.createUser()">Create User</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  async function createUser() {
    const displayName = document.getElementById('newUserName').value.trim();
    const username = document.getElementById('newUserUsername').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    if (!displayName || !username || !password) { APP.toast('All fields required', 'error'); return; }
    try {
      const resp = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, username, password, role }) });
      if (resp.ok) {
        document.getElementById('userModal').remove();
        APP.toast('User created');
        loadUsers();
      } else { const err = await resp.json(); APP.toast(err.error, 'error'); }
    } catch (e) { APP.toast('Failed to create user', 'error'); }
  }

  function showPasswordModal(userId, name) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'pwModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header"><h3>Change Password — ${name}</h3><button class="modal-close" onclick="document.getElementById('pwModal').remove()">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>New Password *</label><input class="form-control" type="password" id="newPw" placeholder="Min 8 characters"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('pwModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Settings.changePassword('${userId}')">Update Password</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  async function changePassword(userId) {
    const password = document.getElementById('newPw').value;
    if (!password || password.length < 8) { APP.toast('Password must be at least 8 characters', 'error'); return; }
    try {
      const resp = await fetch('/api/users/' + userId + '/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (resp.ok) { document.getElementById('pwModal').remove(); APP.toast('Password updated'); }
      else { const err = await resp.json(); APP.toast(err.error, 'error'); }
    } catch (e) { APP.toast('Failed to update password', 'error'); }
  }

  function deleteUser(userId, name) {
    APP.confirm({
      title: 'Delete User?', message: `Remove user "${name}" from the system?`, type: 'danger', confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const resp = await fetch('/api/users/' + userId, { method: 'DELETE' });
          if (resp.ok) { APP.toast('User deleted'); loadUsers(); }
          else { const err = await resp.json(); APP.toast(err.error, 'error'); }
        } catch (e) { APP.toast('Failed to delete user', 'error'); }
      }
    });
  }

  return { render, exportData, importData, resetData, createServerBackup, showBackups, showUserModal, createUser, showPasswordModal, changePassword, deleteUser };
})();
