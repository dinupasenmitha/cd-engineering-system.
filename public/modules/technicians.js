/* =========================================================
   CD Engineering — Technicians Module
   ========================================================= */
window.APP = window.APP || {};

APP.Technicians = (function () {
  const S = () => APP.Store;

  function render(action, id) {
    if (action === 'detail' && id) return renderDetail(id);
    renderList();
  }

  function renderList() {
    const technicians = S().getTechnicians().sort((a, b) => a.name.localeCompare(b.name));
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Technicians</h1><p>Manage your service team</p></div>
            <button class="btn btn-primary" onclick="APP.Technicians.showModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Technician
            </button>
          </div>
        </div>
        <div class="card">
          <div class="card-body compact">
            ${technicians.length ? buildTable(technicians) : '<div class="empty-state"><h3>No technicians</h3><p>Add your first technician.</p></div>'}
          </div>
        </div>
      </div>`;
  }

  function buildTable(technicians) {
    const rows = technicians.map(t => {
      const jobs = S().getJobsByTechnician(t.id);
      const activeJobs = jobs.filter(j => j.status !== 'Completed').length;
      const completedJobs = jobs.filter(j => j.status === 'Completed');
      const revenue = completedJobs.reduce((s, j) => {
        const p = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent);
        return s + p.total;
      }, 0);
      return `<tr class="clickable" onclick="APP.Router.navigate('technicians','detail','${t.id}')">
        <td><strong>${t.name}</strong></td>
        <td>${t.phone}</td>
        <td>${t.specialization}</td>
        <td>${jobs.length} total, ${activeJobs} active</td>
        <td>${revenue > 0 ? S().formatCurrency(revenue) : '—'}</td>
        <td>
          <button class="btn-icon" title="Edit" onclick="event.stopPropagation();APP.Technicians.showModal('${t.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          ${APP.Auth.isAdmin() ? `<button class="btn-icon" title="Delete" onclick="event.stopPropagation();APP.Technicians.confirmDelete('${t.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
        </td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Specialization</th><th>Jobs</th><th>Revenue</th><th style="width:100px">Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderDetail(id) {
    const t = S().getTechnician(id);
    if (!t) { renderList(); return; }
    const jobs = S().getJobsByTechnician(id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const activeJobs = jobs.filter(j => j.status !== 'Completed');
    const completedJobs = jobs.filter(j => j.status === 'Completed');
    const main = document.getElementById('main-content');

    let jobRows = jobs.map(j => {
      const cust = S().getCustomer(j.customerId);
      const bc = j.status === 'Pending' ? 'badge-pending' : j.status === 'In Progress' ? 'badge-inprogress' : 'badge-completed';
      return `<tr class="clickable" onclick="APP.Router.navigate('jobs','detail','${j.id}')">
        <td>${cust ? cust.name : '—'}</td><td>${j.serviceType}</td><td>${j.description}</td>
        <td>${S().formatDate(j.date)}</td><td><span class="badge ${bc}"><span class="badge-dot"></span>${j.status}</span></td>
      </tr>`;
    }).join('');

    main.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('technicians')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back
          </button>
          <h1>${t.name}</h1>
        </div>
        <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
          <div class="kpi-card">
            <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <div class="kpi-info"><h4>Total Jobs</h4><div class="kpi-value">${jobs.length}</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div class="kpi-info"><h4>Active Jobs</h4><div class="kpi-value">${activeJobs.length}</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="kpi-info"><h4>Completed</h4><div class="kpi-value">${completedJobs.length}</div><div class="kpi-sub">${jobs.length > 0 ? Math.round(completedJobs.length / jobs.length * 100) : 0}% rate</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <div class="kpi-info"><h4>Revenue</h4><div class="kpi-value">${S().formatCurrency(completedJobs.reduce((s, j) => { const p = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent); return s + p.total; }, 0))}</div></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:24px">
          <div class="card">
            <div class="card-header"><h3>Info</h3>
              <button class="btn btn-outline btn-sm" onclick="APP.Technicians.showModal('${t.id}')">Edit</button>
            </div>
            <div class="card-body">
              <div class="detail-item" style="margin-bottom:16px"><label>Phone</label><span>${t.phone}</span></div>
              <div class="detail-item" style="margin-bottom:16px"><label>Specialization</label><span>${t.specialization}</span></div>
              <div class="detail-item"><label>Added</label><span>${S().formatDate(t.createdAt)}</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Assigned Jobs (${jobs.length})</h3></div>
            <div class="card-body compact">
              ${jobs.length ? `<table class="data-table"><thead><tr><th>Customer</th><th>Service</th><th>Description</th><th>Date</th><th>Status</th></tr></thead><tbody>${jobRows}</tbody></table>` : '<div class="empty-state"><h3>No jobs assigned</h3></div>'}
            </div>
          </div>
        </div>
      </div>`;
  }

  function showModal(editId) {
    const t = editId ? S().getTechnician(editId) : null;
    const lorries = S().getLorries();
    const lorryOpts = lorries.map(l => `<option value="${l.id}" ${t&&t.lorryId===l.id?'selected':''}>${l.lorryNumber} (${l.assignedArea || 'No Area'})</option>`).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'techModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${t ? 'Edit' : 'Add'} Technician</h3><button class="modal-close" onclick="APP.Technicians.closeModal()">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Name *</label><input class="form-control" id="techName" value="${t ? t.name : ''}" placeholder="Full name"></div>
          <div class="form-group"><label>Phone *</label><input class="form-control" id="techPhone" value="${t ? t.phone : ''}" placeholder="07XXXXXXXX"></div>
          <div class="form-group"><label>Specialization</label><select class="form-control" id="techSpec">
            <option value="Installation" ${t&&t.specialization==='Installation'?'selected':''}>Installation</option>
            <option value="Repair" ${t&&t.specialization==='Repair'?'selected':''}>Repair</option>
            <option value="Service" ${t&&t.specialization==='Service'?'selected':''}>Service</option>
            <option value="Gas Refill" ${t&&t.specialization==='Gas Refill'?'selected':''}>Gas Refill</option>
            <option value="General" ${t&&t.specialization==='General'?'selected':''}>General</option>
          </select></div>
          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label>Role</label>
              <select class="form-control" id="techRole">
                <option value="Junior" ${t&&t.role==='Junior'?'selected':''}>Junior</option>
                <option value="Senior" ${t&&t.role==='Senior'?'selected':''}>Senior</option>
              </select>
            </div>
            <div class="form-group" style="flex:1">
              <label>Assigned Lorry</label>
              <select class="form-control" id="techLorry">
                <option value="">-- None --</option>
                ${lorryOpts}
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="APP.Technicians.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Technicians.saveTechnician('${editId || ''}')">${t ? 'Update' : 'Add'} Technician</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }

  function closeModal() { const m = document.getElementById('techModal'); if (m) m.remove(); }

  async function saveTechnician(editId) {
    const name = document.getElementById('techName').value.trim();
    const phone = document.getElementById('techPhone').value.trim();
    const specialization = document.getElementById('techSpec').value;
    const role = document.getElementById('techRole').value;
    const lorryId = document.getElementById('techLorry').value;

    if (!name || !phone) { APP.toast('Please fill in name and phone', 'error'); return; }
    
    let success = false;
    if (editId) {
      const r = await S().updateTechnician(editId, { name, phone, specialization, role, lorryId });
      if (r) { APP.toast('Technician updated'); success = true; }
    } else {
      const r = await S().addTechnician({ name, phone, specialization, role, lorryId });
      if (r) { APP.toast('Technician added'); success = true; }
    }

    if (success) {
      closeModal();
      renderList();
    }
  }

  function confirmDelete(id) {
    const t = S().getTechnician(id);
    if (!t) return;
    const linked = S().getTechnicianLinkedCounts(id);
    let msg = `This will permanently delete technician "${t.name}"`;
    if (linked.jobCount > 0) msg += `. <strong>${linked.jobCount} job(s)</strong> assigned to this technician will lose their reference`;
    msg += '. This cannot be undone.';
    APP.confirm({
      title: 'Delete Technician?',
      message: msg,
      type: linked.jobCount > 0 ? 'danger' : 'warn',
      confirmText: 'Delete',
      onConfirm: async () => {
        await S().deleteTechnician(id);
        APP.toast('Technician deleted');
        renderList();
      }
    });
  }

  return { render, showModal, closeModal, saveTechnician, confirmDelete };
})();
