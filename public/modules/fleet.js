/* =========================================================
   CD Engineering — Fleet Module (Daily Logs Fuel & GPS)
   ========================================================= */
window.APP = window.APP || {};

APP.Fleet = (function () {
  const S = () => APP.Store;
  let currentSort = { key: 'lorryNumber', asc: true };
  let activeDetailTab = 'team-jobs'; // 'team-jobs' or 'daily-logs'

  function render(action, id) {
    if (action === 'detail' && id) return renderDetail(id);
    renderList();
  }

  function renderList() {
    const container = document.getElementById('main-content');
    if (!container) return;
    const lorries = S().getLorries().slice();
    const technicians = S().getTechnicians();

    lorries.sort((a, b) => {
      let v1 = (a[currentSort.key] || '').toString().toLowerCase();
      let v2 = (b[currentSort.key] || '').toString().toLowerCase();
      if (v1 < v2) return currentSort.asc ? -1 : 1;
      if (v1 > v2) return currentSort.asc ? 1 : -1;
      return 0;
    });

    const activeLorries = lorries.filter(l => l.status === 'Active').length;
    const maintenanceLorries = lorries.filter(l => l.status === 'Maintenance').length;
    const allJobs = S().getJobs();
    const activeJobsWithLorry = allJobs.filter(j => j.lorryId && j.status !== 'Completed').length;

    let html = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Fleet Management</h1><p>Manage lorries, daily fuel consumption, and GPS tracking logs</p></div>
            ${APP.Auth.isAdmin() ? `<button class="btn btn-primary" onclick="APP.Fleet.openModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Lorry
            </button>` : ''}
          </div>
        </div>

        <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi-card">
            <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
            <div class="kpi-info"><h4>Total Lorries</h4><div class="kpi-value">${lorries.length}</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="kpi-info"><h4>Active Units</h4><div class="kpi-value">${activeLorries}</div><div class="kpi-sub">Ready for dispatch</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
            <div class="kpi-info"><h4>Maintenance</h4><div class="kpi-value">${maintenanceLorries}</div><div class="kpi-sub">Under service</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <div class="kpi-info"><h4>Active Jobs</h4><div class="kpi-value">${activeJobsWithLorry}</div><div class="kpi-sub">Assigned to fleet</div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-body compact">
            ${lorries.length ? buildTable(lorries, technicians) : '<div class="empty-state"><h3>No lorries yet</h3><p>Add your first lorry to get started.</p></div>'}
          </div>
        </div>
      </div>`;

    container.innerHTML = html;
  }

  function buildTable(lorries, technicians) {
    const rows = lorries.map(l => {
      const team = technicians.filter(t => t.lorryId === l.id);
      const jobs = S().getJobs().filter(j => j.lorryId === l.id && j.status !== 'Completed');
      const teamHTML = team.length > 0
        ? team.map(t => `<span class="badge" style="margin-right:4px;font-size:11px;background:var(--primary-100);color:var(--primary-600)">${t.name}</span>`).join('')
        : '<span class="text-muted" style="font-size:12px">No team assigned</span>';

      return `
        <tr class="clickable" onclick="APP.Router.navigate('fleet','detail','${l.id}')">
          <td><strong>${l.lorryNumber}</strong></td>
          <td>${l.assignedArea || '—'}</td>
          <td>${teamHTML}</td>
          <td><span class="badge" style="font-size:11px">${jobs.length} active</span></td>
          <td><span class="status-badge status-${l.status}">${l.status}</span></td>
          <td style="text-align:right" onclick="event.stopPropagation()">
            <div class="btn-group" style="justify-content:flex-end">
              <button class="btn btn-outline btn-xs" onclick="APP.Router.navigate('fleet','detail','${l.id}')">Daily Logs</button>
              <button class="btn-icon" onclick="APP.Fleet.openModal('${l.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              ${APP.Auth.isAdmin() ? `<button class="btn-icon" onclick="APP.Fleet.deleteLorry('${l.id}')" title="Delete" style="color:var(--danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');

    return `<table class="data-table"><thead><tr>
      <th onclick="APP.Fleet.sort('lorryNumber')" style="cursor:pointer">Lorry # ${sortIcon('lorryNumber')}</th>
      <th onclick="APP.Fleet.sort('assignedArea')" style="cursor:pointer">Assigned Area ${sortIcon('assignedArea')}</th>
      <th>Assigned Team</th>
      <th>Jobs</th>
      <th onclick="APP.Fleet.sort('status')" style="cursor:pointer">Status ${sortIcon('status')}</th>
      <th style="width:180px;text-align:right">Actions</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function renderDetail(id) {
    const container = document.getElementById('main-content');
    if (!container) return;
    const lorry = S().getLorry(id);
    if (!lorry) { renderList(); return; }

    const technicians = S().getTechnicians().filter(t => t.lorryId === id);
    const allJobs = S().getJobs().filter(j => j.lorryId === id);
    const activeJobs = allJobs.filter(j => j.status !== 'Completed');

    // Load daily logs
    const dailyLogs = await S().getLorryLogs(id);

    // Calculate logs metrics
    const totalFuelCost = dailyLogs.reduce((sum, log) => sum + (log.fuel_cost || 0), 0);
    const totalFuelLiters = dailyLogs.reduce((sum, log) => sum + (log.fuel_liters || 0), 0);
    const totalKms = dailyLogs.reduce((sum, log) => {
      const diff = (log.end_odometer || 0) - (log.start_odometer || 0);
      return sum + (diff > 0 ? diff : 0);
    }, 0);
    const avgKms = dailyLogs.length > 0 ? (totalKms / dailyLogs.length).toFixed(1) : 0;
    const avgFuelEconomy = totalFuelLiters > 0 ? (totalKms / totalFuelLiters).toFixed(2) : 0;

    let subViewHtml = '';
    if (activeDetailTab === 'team-jobs') {
      const completedJobs = allJobs.filter(j => j.status === 'Completed');
      const totalRevenue = completedJobs.reduce((sum, j) => {
        const p = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent);
        return sum + p.total;
      }, 0);

      const jobRows = allJobs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(j => {
        const cust = S().getCustomer(j.customerId);
        const tech = S().getTechnician(j.technicianId);
        const bc = j.status === 'Pending' ? 'badge-pending' : j.status === 'In Progress' ? 'badge-inprogress' : 'badge-completed';
        const pricing = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent);
        return `<tr class="clickable" onclick="APP.Router.navigate('jobs','detail','${j.id}')">
          <td><strong>${cust ? cust.name : '—'}</strong></td>
          <td>${j.serviceType}</td>
          <td>${tech ? tech.name : '—'}</td>
          <td>${S().formatDate(j.date)}</td>
          <td>${S().formatCurrency(pricing.total)}</td>
          <td><span class="badge ${bc}"><span class="badge-dot"></span>${j.status}</span></td>
        </tr>`;
      }).join('');

      const techCards = technicians.map(t => `
        <div class="kpi-card" style="cursor:pointer" onclick="APP.Router.navigate('technicians','detail','${t.id}')">
          <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
          <div class="kpi-info">
            <h4>${t.role}</h4>
            <div class="kpi-value" style="font-size:16px">${t.name}</div>
            <div class="kpi-sub">${t.phone}</div>
          </div>
        </div>
      `).join('');

      subViewHtml = `
        ${technicians.length ? `
        <div class="card mb-20">
          <div class="card-header"><h3>Assigned Team (${technicians.length})</h3></div>
          <div class="card-body"><div class="kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));margin-bottom:0">${techCards}</div></div>
        </div>` : ''}

        <div class="card">
          <div class="card-header"><h3>Lorry Jobs history</h3></div>
          <div class="card-body compact">
            ${allJobs.length ? `<table class="data-table"><thead><tr><th>Customer</th><th>Service</th><th>Technician</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${jobRows}</tbody></table>` : '<div class="empty-state"><p>No jobs assigned to this lorry yet.</p></div>'}
          </div>
        </div>
      `;
    } else {
      // Daily Logs view
      const logRows = dailyLogs.map(log => {
        const kms = log.end_odometer - log.start_odometer;
        return `
          <tr>
            <td>${S().formatDate(log.date)}</td>
            <td>${log.start_odometer} km</td>
            <td>${log.end_odometer} km</td>
            <td><strong>${kms > 0 ? kms + ' km' : '—'}</strong></td>
            <td>${log.fuel_liters ? log.fuel_liters + ' L' : '—'}</td>
            <td><strong>${log.fuel_cost ? S().formatCurrency(log.fuel_cost) : '—'}</strong></td>
            <td>
              ${log.gps_summary ? `
                <a href="${log.gps_summary.startsWith('http') ? log.gps_summary : '#'}" target="_blank" class="badge" style="background:var(--primary-100);color:var(--primary-700)">
                  View Route / GPS
                </a>
              ` : '—'}
            </td>
            <td>${log.notes || '—'}</td>
            <td style="text-align:right">
              ${APP.Auth.isAdmin() ? `<button class="btn-icon" onclick="APP.Fleet.deleteLog('${lorry.id}', '${log.id}')" style="color:var(--danger)" title="Delete log"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
            </td>
          </tr>
        `;
      }).join('');

      subViewHtml = `
        <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px">
          <div class="kpi-card">
            <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
            <div class="kpi-info"><h4>Total Distance</h4><div class="kpi-value">${totalKms} km</div><div class="kpi-sub">Avg ${avgKms} km / day</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon red" style="background:rgba(239, 68, 68, 0.1);color:var(--danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <div class="kpi-info"><h4>Total Fuel Cost</h4><div class="kpi-value" style="color:var(--danger)">${S().formatCurrency(totalFuelCost)}</div><div class="kpi-sub">${totalFuelLiters} Liters filled</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div class="kpi-info"><h4>Fuel Efficiency</h4><div class="kpi-value">${avgFuelEconomy} km/L</div><div class="kpi-sub">Distance over liters</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-info"><h4>Record Tracking</h4>
              <button class="btn btn-primary btn-sm mt-8" onclick="APP.Fleet.openLogModal('${lorry.id}')" style="width:100%">
                + Record Daily Log
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Daily Logs History</h3>
          </div>
          <div class="card-body compact">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Start Odo</th>
                    <th>End Odo</th>
                    <th>Distance</th>
                    <th>Fuel Filled</th>
                    <th>Fuel Cost</th>
                    <th>GPS / Location</th>
                    <th>Notes</th>
                    <th style="width:70px;text-align:right">Del</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailyLogs.length ? logRows : `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--gray-400)">No daily tracking logs recorded. Click 'Record Daily Log' to add one.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('fleet')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back
          </button>
          <h1>${lorry.lorryNumber}</h1>
          <span class="status-badge status-${lorry.status}" style="margin-left: 12px">${lorry.status}</span>
        </div>

        <div class="toolbar">
          <div class="filter-tabs" style="margin:0">
            <button class="filter-tab ${activeDetailTab === 'team-jobs' ? 'active' : ''}" onclick="APP.Fleet.setDetailTab('${lorry.id}', 'team-jobs')">
              Team & Jobs
            </button>
            <button class="filter-tab ${activeDetailTab === 'daily-logs' ? 'active' : ''}" onclick="APP.Fleet.setDetailTab('${lorry.id}', 'daily-logs')">
              Daily Tracking Logs (Fuel & GPS)
            </button>
          </div>
        </div>

        ${subViewHtml}
      </div>`;
  }

  function setDetailTab(id, tab) {
    activeDetailTab = tab;
    renderDetail(id);
  }

  async function openLogModal(lorryId) {
    // Fetch ending odo from previous log
    const logs = await S().getLorryLogs(lorryId);
    const lastOdo = logs.length > 0 ? logs[0].end_odometer : 0;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'lorryLogModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <h3>Record Daily Lorry Log</h3>
          <button class="modal-close" onclick="document.getElementById('lorryLogModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Date *</label>
            <input type="date" id="lg-date" value="${new Date().toISOString().split('T')[0]}" class="form-control" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start Odometer (km)</label>
              <input type="number" id="lg-start-odo" value="${lastOdo}" class="form-control">
            </div>
            <div class="form-group">
              <label>End Odometer (km) *</label>
              <input type="number" id="lg-end-odo" class="form-control" placeholder="Ending km" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Fuel Liters</label>
              <input type="number" id="lg-liters" class="form-control" step="any" placeholder="Liters filled">
            </div>
            <div class="form-group">
              <label>Fuel Cost (Rs.)</label>
              <input type="number" id="lg-cost" class="form-control" placeholder="Amount paid">
            </div>
          </div>
          <div class="form-group">
            <label>GPS Route / Map URL</label>
            <input type="text" id="lg-gps" class="form-control" placeholder="Paste GPS route tracking link or summary">
          </div>
          <div class="form-group">
            <label>Notes</label>
            <input type="text" id="lg-notes" class="form-control" placeholder="Any logs/driver notes">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('lorryLogModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Fleet.saveLog('${lorryId}')">Record Log</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  async function saveLog(lorryId) {
    const date = document.getElementById('lg-date').value;
    const startOdometer = parseFloat(document.getElementById('lg-start-odo').value) || 0;
    const endOdometer = parseFloat(document.getElementById('lg-end-odo').value) || 0;
    const fuelLiters = parseFloat(document.getElementById('lg-liters').value) || 0;
    const fuelCost = parseFloat(document.getElementById('lg-cost').value) || 0;
    const gpsSummary = document.getElementById('lg-gps').value.trim();
    const notes = document.getElementById('lg-notes').value.trim();

    if (!date || endOdometer <= startOdometer) {
      APP.toast('Please enter a valid ending odometer greater than starting odometer', 'error');
      return;
    }

    const payload = { date, startOdometer, endOdometer, fuelLiters, fuelCost, gpsSummary, notes };
    const res = await S().addLorryLog(lorryId, payload);
    if (res) {
      APP.toast('Daily lorry log recorded successfully');
      document.getElementById('lorryLogModal').remove();
      await S().loadAll();
      renderDetail(lorryId);
    }
  }

  function deleteLog(lorryId, logId) {
    APP.confirm({
      title: 'Delete Daily Log?',
      message: 'Delete this tracking log entry? If this log contains fuel cost, it will automatically remove the fuel bill from expenses too.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        await S().deleteLorryLog(lorryId, logId);
        APP.toast('Log deleted');
        await S().loadAll();
        renderDetail(lorryId);
      }
    });
  }

  function sortIcon(key) {
    if (currentSort.key !== key) return '<span style="opacity:0.2">↕</span>';
    return currentSort.asc ? '↑' : '↓';
  }

  function sort(key) {
    if (currentSort.key === key) currentSort.asc = !currentSort.asc;
    else { currentSort.key = key; currentSort.asc = true; }
    renderList();
  }

  function openModal(id) {
    id = id || null;
    let lorry = id ? S().getLorry(id) : { lorryNumber: '', assignedArea: '', status: 'Active' };
    if (!lorry) lorry = { lorryNumber: '', assignedArea: '', status: 'Active' };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'fltModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${id ? 'Edit' : 'Add'} Lorry</h3>
          <button class="modal-close" onclick="APP.Fleet.closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Lorry Number *</label>
            <input type="text" id="fl-number" value="${lorry.lorryNumber}" class="form-control" required placeholder="e.g. WP-LM-1234">
          </div>
          <div class="form-group">
            <label>Assigned Area</label>
            <input type="text" id="fl-area" value="${lorry.assignedArea || ''}" class="form-control" placeholder="e.g. Colombo District">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="fl-status" class="form-control">
              <option value="Active" ${lorry.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Maintenance" ${lorry.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
              <option value="Inactive" ${lorry.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="APP.Fleet.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Fleet.save('${id || ''}')">Save</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }

  function closeModal() { const m = document.getElementById('fltModal'); if (m) m.remove(); }

  async function save(id) {
    const lorryNumber = document.getElementById('fl-number').value.trim();
    const assignedArea = document.getElementById('fl-area').value.trim();
    const status = document.getElementById('fl-status').value;

    if (!lorryNumber) { APP.toast('Please enter a lorry number', 'error'); return; }

    try {
      if (id) {
        await S().updateLorry(id, { lorryNumber, assignedArea, status });
        APP.toast('Lorry updated successfully');
      } else {
        await S().addLorry({ lorryNumber, assignedArea, status });
        APP.toast('Lorry added successfully');
      }
      closeModal();
      await S().loadAll();
      renderList();
    } catch (e) {
      APP.toast(e.message, 'error');
    }
  }

  async function deleteLorry(id) {
    const lorry = S().getLorry(id);
    if (!lorry) return;
    const team = S().getTechnicians().filter(t => t.lorryId === id);
    const jobs = S().getJobs().filter(j => j.lorryId === id && j.status !== 'Completed');

    let msg = `This will permanently delete lorry "${lorry.lorryNumber}"`;
    if (team.length) msg += `. <strong>${team.length} technician(s)</strong> will be unassigned`;
    if (jobs.length) msg += `. <strong>${jobs.length} active job(s)</strong> will lose their lorry reference`;
    msg += '. This cannot be undone.';

    APP.confirm({
      title: 'Delete Lorry?',
      message: msg,
      type: team.length || jobs.length ? 'danger' : 'warn',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await S().deleteLorry(id);
          APP.toast('Lorry deleted');
          await S().loadAll();
          renderList();
        } catch (e) {
          APP.toast(e.message, 'error');
        }
      }
    });
  }

  return { render, sort, openModal, closeModal, save, deleteLorry, setDetailTab, openLogModal, saveLog, deleteLog };
})();
