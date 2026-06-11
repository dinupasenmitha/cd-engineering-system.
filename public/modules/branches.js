/* =========================================================
   CD Engineering — Branches & SBUs Module
   ========================================================= */
window.APP = window.APP || {};

APP.Branches = (function () {
  const S = () => APP.Store;
  let currentSearch = '';

  function render(action, id) {
    renderList();
  }

  function getNextDueDate(lastDate, monthsInterval) {
    if (!lastDate) return null;
    const d = new Date(lastDate);
    if (isNaN(d.getTime())) return null;
    d.setMonth(d.getMonth() + monthsInterval);
    return d;
  }

  function getServiceStatus(dueDate) {
    if (!dueDate) return { text: 'Overdue', class: 'badge-unpaid', daysLeft: -9999 };
    const now = new Date();
    // Reset times to compare dates
    now.setHours(0,0,0,0);
    const due = new Date(dueDate);
    due.setHours(0,0,0,0);

    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Overdue', class: 'badge-unpaid', daysLeft: diffDays };
    } else if (diffDays <= 14) {
      return { text: 'Due Soon', class: 'badge-pending', daysLeft: diffDays };
    } else {
      return { text: 'Serviced', class: 'badge-paid', daysLeft: diffDays };
    }
  }

  function renderList() {
    const main = document.getElementById('main-content');
    const branches = S().getBranches().filter(b =>
      b.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
      (b.address && b.address.toLowerCase().includes(currentSearch.toLowerCase()))
    );

    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div>
              <h1>Branches & SBUs</h1>
              <p>Manage branch locations and track periodic maintenance schedules</p>
            </div>
            <button class="btn btn-primary" onclick="APP.Branches.openModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Branch
            </button>
          </div>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="branchSearch" placeholder="Search branches..." value="${currentSearch}" oninput="APP.Branches.search(this.value)">
          </div>
        </div>

        <!-- Service Due Dashboard Widget -->
        <div class="card mb-20">
          <div class="card-header">
            <h3>Service Due Schedule</h3>
          </div>
          <div class="card-body compact">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Location / SBU</th>
                    <th>Type</th>
                    <th>Last Service</th>
                    <th>Next Service Due</th>
                    <th>Service Status</th>
                    <th>Last DP Service</th>
                    <th>Next DP Due</th>
                    <th>DP Status</th>
                    <th style="width:180px;text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${branches.length ? branches.map(b => {
                    const regInterval = b.type === 'SBU' ? 1 : 2;
                    const dpInterval = b.type === 'SBU' ? 6 : 12;

                    const nextReg = getNextDueDate(b.last_service_date || b.lastServiceDate, regInterval);
                    const regStatus = getServiceStatus(nextReg);

                    const nextDp = getNextDueDate(b.last_dp_service_date || b.lastDpServiceDate, dpInterval);
                    const dpStatus = getServiceStatus(nextDp);

                    const showRegAlert = regStatus.text !== 'Serviced';
                    const showDpAlert = dpStatus.text !== 'Serviced';
                    const needsAction = showRegAlert || showDpAlert;

                    return `
                      <tr>
                        <td>
                          <strong>${b.name}</strong>
                          <div class="text-muted" style="font-size:11px">${b.address || 'No address'}</div>
                        </td>
                        <td>
                          <span class="badge" style="background:var(--primary-100);color:var(--primary-600);font-size:11px">${b.type}</span>
                        </td>
                        <td>${S().formatDate(b.last_service_date || b.lastServiceDate)}</td>
                        <td>
                          <strong>${nextReg ? S().formatDate(nextReg) : 'Never'}</strong>
                          ${nextReg ? `<div class="text-muted" style="font-size:10px">${regStatus.daysLeft < 0 ? Math.abs(regStatus.daysLeft) + ' days overdue' : regStatus.daysLeft + ' days left'}</div>` : ''}
                        </td>
                        <td>
                          <span class="badge ${regStatus.class}"><span class="badge-dot"></span>${regStatus.text}</span>
                        </td>
                        <td>${S().formatDate(b.last_dp_service_date || b.lastDpServiceDate)}</td>
                        <td>
                          <strong>${nextDp ? S().formatDate(nextDp) : 'Never'}</strong>
                          ${nextDp ? `<div class="text-muted" style="font-size:10px">${dpStatus.daysLeft < 0 ? Math.abs(dpStatus.daysLeft) + ' days overdue' : dpStatus.daysLeft + ' days left'}</div>` : ''}
                        </td>
                        <td>
                          <span class="badge ${dpStatus.class}"><span class="badge-dot"></span>${dpStatus.text}</span>
                        </td>
                        <td style="text-align:right">
                          <div class="btn-group" style="justify-content:flex-end">
                            ${needsAction ? `
                              <button class="btn btn-primary btn-xs" onclick="APP.Branches.scheduleService('${b.id}', '${showDpAlert ? 'DP Service' : 'Regular Service'}')" title="Schedule Service">
                                Schedule
                              </button>
                            ` : ''}
                            <button class="btn-icon" onclick="APP.Branches.openModal('${b.id}')" title="Edit">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn-icon" onclick="APP.Branches.confirmDelete('${b.id}')" title="Delete" style="color:var(--danger)">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--gray-400)">No branches found. Add a branch to start service due tracking.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function search(val) {
    currentSearch = val;
    renderList();
  }

  function scheduleService(branchId, type) {
    const b = S().getBranch(branchId);
    if (!b) return;

    // Switch to Jobs tab and pre-fill job modal
    APP.Router.navigate('jobs');
    // Set a tiny timeout to ensure the jobs rendering is done, then open modal
    setTimeout(() => {
      // Find default service or parts pricing
      const services = S().getServices();
      const matchingService = services.find(s => s.name.toLowerCase().includes(type.toLowerCase())) || services[0];

      APP.Jobs.showModal();

      setTimeout(() => {
        const branchSelect = document.getElementById('jobBranch');
        if (branchSelect) branchSelect.value = branchId;

        const serviceSelect = document.getElementById('jobServiceId');
        if (serviceSelect && matchingService) {
          serviceSelect.value = matchingService.id;
          APP.Jobs.onServiceChange();
        }

        const descInput = document.getElementById('jobDesc');
        if (descInput) descInput.value = `Scheduled ${type} maintenance for ${b.name} branch.`;
      }, 100);
    }, 150);
  }

  function openModal(id) {
    const b = id ? S().getBranch(id) : null;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'branchModal';

    overlay.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <h3>${b ? 'Edit' : 'Add'} Branch / SBU</h3>
          <button class="modal-close" onclick="document.getElementById('branchModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" id="br-name" value="${b ? b.name : ''}" class="form-control" placeholder="e.g. Colombo Office / Sampath Bank Kandy">
          </div>
          <div class="form-group">
            <label>Type *</label>
            <select id="br-type" class="form-control">
              <option value="Branch" ${b && b.type === 'Branch' ? 'selected' : ''}>Branch (Regular: 2M, DP: 12M)</option>
              <option value="SBU" ${b && b.type === 'SBU' ? 'selected' : ''}>SBU (Regular: 1M, DP: 6M)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input type="text" id="br-address" value="${b && b.address ? b.address : ''}" class="form-control" placeholder="Physical address">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" id="br-phone" value="${b && b.phone ? b.phone : ''}" class="form-control" placeholder="Contact number">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Last Regular Service</label>
              <input type="date" id="br-last-service" value="${b ? (b.last_service_date || b.lastServiceDate || '') : ''}" class="form-control">
            </div>
            <div class="form-group">
              <label>Last DP Service</label>
              <input type="date" id="br-last-dp" value="${b ? (b.last_dp_service_date || b.lastDpServiceDate || '') : ''}" class="form-control">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('branchModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Branches.save('${id || ''}')">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  async function save(id) {
    const name = document.getElementById('br-name').value.trim();
    const type = document.getElementById('br-type').value;
    const address = document.getElementById('br-address').value.trim();
    const phone = document.getElementById('br-phone').value.trim();
    const lastServiceDate = document.getElementById('br-last-service').value || '';
    const lastDpServiceDate = document.getElementById('br-last-dp').value || '';

    if (!name || !type) {
      APP.toast('Name and type are required', 'error');
      return;
    }

    const payload = { name, type, address, phone, lastServiceDate, lastDpServiceDate };

    if (id) {
      const res = await S().updateBranch(id, payload);
      if (res) APP.toast('Branch updated successfully');
    } else {
      const res = await S().addBranch(payload);
      if (res) APP.toast('Branch added successfully');
    }

    document.getElementById('branchModal').remove();
    await S().loadAll();
    renderList();
  }

  function confirmDelete(id) {
    const b = S().getBranch(id);
    if (!b) return;

    APP.confirm({
      title: 'Delete Branch / SBU?',
      message: `Are you sure you want to delete the branch "${b.name}"? This cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        await S().deleteBranch(id);
        APP.toast('Branch deleted');
        await S().loadAll();
        renderList();
      }
    });
  }

  return { render, search, openModal, save, confirmDelete, scheduleService };
})();
