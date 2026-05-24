/* =========================================================
   CD Engineering — Customers Module (Production-Ready)
   ========================================================= */
window.APP = window.APP || {};

APP.Customers = (function () {
  const S = () => APP.Store;

  function render(action, id) {
    if (action === 'detail' && id) return renderDetail(id);
    renderList();
  }

  function renderList() {
    const customers = S().getCustomers().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Customers</h1><p>Manage your customer database</p></div>
            <button class="btn btn-primary" onclick="APP.Customers.showModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Customer
            </button>
          </div>
        </div>
        <div class="toolbar">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="customerSearch" placeholder="Search customers..." oninput="APP.Customers.search(this.value)">
          </div>
          <span class="text-muted">${customers.length} customers</span>
        </div>
        <div class="card">
          <div class="card-body compact">
            <div class="table-container" id="customerTableWrap">${buildTable(customers)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function buildTable(customers) {
    if (!customers.length) return '<div class="empty-state"><h3>No customers found</h3></div>';
    const rows = customers.map(c => {
      const jobCount = S().getJobsByCustomer(c.id).length;
      const invoices = S().getInvoicesByCustomer(c.id);
      const revenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
      return `<tr class="clickable" onclick="APP.Router.navigate('customers','detail','${c.id}')">
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td>${c.address}</td>
        <td>${jobCount} job${jobCount !== 1 ? 's' : ''}</td>
        <td>${revenue > 0 ? S().formatCurrency(revenue) : '—'}</td>
        <td>
          <button class="btn-icon" title="Edit" onclick="event.stopPropagation();APP.Customers.showModal('${c.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          ${APP.Auth.isAdmin() ? `<button class="btn-icon" title="Delete" onclick="event.stopPropagation();APP.Customers.confirmDelete('${c.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
        </td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Jobs</th><th>Revenue</th><th style="width:100px">Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function search(q) {
    const customers = q.trim() ? S().searchCustomers(q) : S().getCustomers().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    document.getElementById('customerTableWrap').innerHTML = buildTable(customers);
  }

  async function renderDetail(id) {
    const c = S().getCustomer(id);
    if (!c) { renderList(); return; }
    const jobs = S().getJobsByCustomer(id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const invoices = S().getInvoicesByCustomer(id);
    const docs = await S().getDocumentsByCustomer(id);
    const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const paidRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total || 0), 0);
    const activeJobs = jobs.filter(j => j.status !== 'Completed').length;
    const main = document.getElementById('main-content');

    let jobRows = jobs.map(j => {
      const tech = S().getTechnician(j.technicianId);
      const inv = S().getInvoiceByJob(j.id);
      const pricing = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent);
      const bc = j.status === 'Pending' ? 'badge-pending' : j.status === 'In Progress' ? 'badge-inprogress' : 'badge-completed';
      return `<tr class="clickable" onclick="APP.Router.navigate('jobs','detail','${j.id}')">
        <td>${j.serviceType}</td><td>${j.description}</td><td>${tech ? tech.name : '—'}</td>
        <td>${S().formatDate(j.date)}</td><td>${S().formatCurrency(pricing.total)}</td>
        <td><span class="badge ${bc}"><span class="badge-dot"></span>${j.status}</span></td>
        <td>${inv ? '<span class="text-primary" style="font-size:12px;font-weight:600">' + inv.invoiceNumber + '</span>' : '—'}</td>
      </tr>`;
    }).join('');

    main.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('customers')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back
          </button>
          <h1>${c.name}</h1>
        </div>

        <!-- KPI row -->
        <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
          <div class="kpi-card"><div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="kpi-info"><h4>Total Jobs</h4><div class="kpi-value">${jobs.length}</div></div></div>
          <div class="kpi-card"><div class="kpi-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="kpi-info"><h4>Active</h4><div class="kpi-value">${activeJobs}</div></div></div>
          <div class="kpi-card"><div class="kpi-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="kpi-info"><h4>Revenue</h4><div class="kpi-value">${S().formatCurrency(totalRevenue)}</div></div></div>
          <div class="kpi-card"><div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="20 6 9 17 4 12"/></svg></div><div class="kpi-info"><h4>Collected</h4><div class="kpi-value">${S().formatCurrency(paidRevenue)}</div></div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 2.5fr;gap:24px;">
          <div class="card">
            <div class="card-header"><h3>Customer Info</h3>
              <button class="btn btn-outline btn-sm" onclick="APP.Customers.showModal('${c.id}')">Edit</button>
            </div>
            <div class="card-body">
              <div class="detail-item" style="margin-bottom:16px"><label>Phone</label><span>${c.phone}</span></div>
              <div class="detail-item" style="margin-bottom:16px"><label>Address</label><span>${c.address}</span></div>
              <div class="detail-item" style="margin-bottom:16px"><label>Notes</label><span>${c.notes || '—'}</span></div>
              <div class="detail-item" style="margin-bottom:20px"><label>Customer Since</label><span>${S().formatDate(c.createdAt)}</span></div>
              <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center" onclick="APP.Jobs.showModalForCustomer('${c.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Create Job
              </button>
              ${c.phone ? `<a class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:8px" href="https://wa.me/${c.phone.replace(/^0/,'94')}?text=${encodeURIComponent('Hi ' + c.name + ', this is CD Engineering.')}" target="_blank">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg> WhatsApp
              </a>` : ''}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Job History (${jobs.length})</h3></div>
            <div class="card-body compact">
              ${jobs.length ? `<table class="data-table"><thead><tr><th>Service</th><th>Description</th><th>Technician</th><th>Date</th><th>Amount</th><th>Status</th><th>Invoice</th></tr></thead><tbody>${jobRows}</tbody></table>` : '<div class="empty-state"><h3>No jobs</h3><p>No jobs recorded for this customer.</p></div>'}
            </div>
          </div>
          <div class="card mt-20" style="grid-column:1 / -1">
            <div class="card-header"><h3>Signed Documents (${docs.length})</h3></div>
            <div class="card-body compact">
              ${docs.length ? APP.Documents.buildInlineDocGallery(docs) : '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h3>No documents yet</h3><p>Upload a signed job sheet or invoice from a job detail page.</p></div>'}
            </div>
          </div>
        </div>
      </div>`;
  }

  function showModal(editId) {
    const c = editId ? S().getCustomer(editId) : null;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'customerModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${c ? 'Edit' : 'Add'} Customer</h3><button class="modal-close" onclick="APP.Customers.closeModal()">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Full Name *</label><input class="form-control" id="custName" value="${c ? c.name : ''}" placeholder="Customer name"></div>
          <div class="form-group"><label>Phone Number *</label><input class="form-control" id="custPhone" value="${c ? c.phone : ''}" placeholder="07XXXXXXXX"></div>
          <div class="form-group"><label>Address</label><input class="form-control" id="custAddress" value="${c ? c.address : ''}" placeholder="Full address"></div>
          <div class="form-group"><label>Notes</label><textarea class="form-control" id="custNotes" placeholder="Any notes...">${c ? c.notes : ''}</textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="APP.Customers.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Customers.saveCustomer('${editId || ''}')">${c ? 'Update' : 'Add'} Customer</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }

  function closeModal() { const m = document.getElementById('customerModal'); if (m) m.remove(); }

  function saveCustomer(editId) {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const notes = document.getElementById('custNotes').value.trim();
    if (!name || !phone) { APP.toast('Please fill in name and phone', 'error'); return; }
    if (editId) { S().updateCustomer(editId, { name, phone, address, notes }); APP.toast('Customer updated'); }
    else { S().addCustomer({ name, phone, address, notes }); APP.toast('Customer added'); }
    closeModal();
    // Re-render current view
    const hash = window.location.hash;
    if (hash.includes('detail')) {
      const id = hash.split('/')[2];
      if (id) renderDetail(id); else renderList();
    } else { renderList(); }
  }

  function confirmDelete(id) {
    const c = S().getCustomer(id);
    if (!c) return;
    const linked = S().getCustomerLinkedCounts(id);
    let msg = `This will permanently delete customer "${c.name}"`;
    if (linked.jobCount > 0) msg += ` along with <strong>${linked.jobCount} job(s)</strong> and <strong>${linked.invCount} invoice(s)</strong> that will become orphaned`;
    msg += '. This cannot be undone.';
    APP.confirm({
      title: 'Delete Customer?',
      message: msg,
      type: linked.jobCount > 0 ? 'danger' : 'warn',
      confirmText: 'Delete',
      onConfirm: () => {
        S().deleteCustomer(id);
        APP.toast('Customer deleted');
        renderList();
      }
    });
  }

  return { render, search, showModal, closeModal, saveCustomer, confirmDelete };
})();
