/* =========================================================
   CD Engineering — Jobs Module (Phase 2)
   ========================================================= */
window.APP = window.APP || {};

APP.Jobs = (function () {
  const S = () => APP.Store;
  let currentFilter = 'All';
  let searchQuery = '';

  function render(action, id) {
    if (action === 'detail' && id) return renderDetail(id);
    renderList();
  }

  function renderList() {
    const main = document.getElementById('main-content');
    const stats = S().getStats();
    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Jobs</h1><p>Manage all service jobs</p></div>
            <button class="btn btn-primary" onclick="APP.Jobs.showModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Job
            </button>
          </div>
        </div>
        <div class="toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${currentFilter==='All'?'active':''}" onclick="APP.Jobs.filter('All')">All (${stats.totalJobs})</button>
            <button class="filter-tab ${currentFilter==='Pending'?'active':''}" onclick="APP.Jobs.filter('Pending')">Pending (${stats.pendingJobs})</button>
            <button class="filter-tab ${currentFilter==='In Progress'?'active':''}" onclick="APP.Jobs.filter('In Progress')">In Progress (${stats.inProgressJobs})</button>
            <button class="filter-tab ${currentFilter==='Completed'?'active':''}" onclick="APP.Jobs.filter('Completed')">Completed (${stats.completedJobs})</button>
          </div>
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="jobSearch" placeholder="Search jobs..." value="${searchQuery}" oninput="APP.Jobs.search(this.value)">
          </div>
        </div>
        <div class="card">
          <div class="card-body compact">
            <div class="table-container" id="jobsTableWrap">${buildTable()}</div>
          </div>
        </div>
      </div>`;
  }

  function buildTable() {
    let jobs = currentFilter === 'All' ? S().getJobs() : S().getJobsByStatus(currentFilter);
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(j => {
        const cust = S().getCustomer(j.customerId);
        return (cust && cust.name.toLowerCase().includes(q)) ||
               j.description.toLowerCase().includes(q) ||
               j.serviceType.toLowerCase().includes(q);
      });
    }
    jobs.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!jobs.length) return '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h3>No jobs found</h3><p>Try adjusting your search or filters.</p></div>';

    const rows = jobs.map(j => {
      const cust = S().getCustomer(j.customerId);
      const tech = S().getTechnician(j.technicianId);
      const inv = S().getInvoiceByJob(j.id);
      const pricing = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent);
      const bc = j.status === 'Pending' ? 'badge-pending' : j.status === 'In Progress' ? 'badge-inprogress' : 'badge-completed';
      return `<tr class="clickable" onclick="APP.Router.navigate('jobs','detail','${j.id}')">
        <td><strong>${cust ? cust.name : '—'}</strong></td>
        <td>${j.serviceType}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.description}</td>
        <td>${tech ? tech.name : '—'}</td>
        <td>${S().formatDate(j.date)}</td>
        <td>${S().formatCurrency(pricing.total)}</td>
        <td><span class="badge ${bc}"><span class="badge-dot"></span>${j.status}</span></td>
        <td>
          <div class="btn-group">
            ${j.status !== 'Completed' ? `<button class="btn btn-success btn-xs" onclick="event.stopPropagation();APP.Jobs.advanceStatus('${j.id}')" title="${j.status === 'Pending' ? 'Start Job' : 'Complete Job'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
            </button>` : ''}
            <button class="btn-icon" onclick="event.stopPropagation();APP.Jobs.showModal('${j.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            ${APP.Auth.isAdmin() ? `<button class="btn-icon" onclick="event.stopPropagation();APP.Jobs.confirmDelete('${j.id}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');

    return `<table class="data-table"><thead><tr><th>Customer</th><th>Service</th><th>Description</th><th>Technician</th><th>Date</th><th>Amount</th><th>Status</th><th style="width:120px">Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function filter(status) { currentFilter = status; renderList(); }
  function search(q) { searchQuery = q; document.getElementById('jobsTableWrap').innerHTML = buildTable(); }

  function renderDetail(id) {
    const j = S().getJob(id);
    if (!j) { renderList(); return; }
    const cust = S().getCustomer(j.customerId);
    const tech = S().getTechnician(j.technicianId);
    const inv = S().getInvoiceByJob(id);
    const bc = j.status === 'Pending' ? 'badge-pending' : j.status === 'In Progress' ? 'badge-inprogress' : 'badge-completed';
    const pricing = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent);
    const main = document.getElementById('main-content');

    main.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('jobs')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back
          </button>
          <h1>Job Details</h1>
          <span class="badge ${bc}" style="margin-left:12px;font-size:14px;padding:6px 16px"><span class="badge-dot"></span>${j.status}</span>
          ${j.jobNumber ? `<span style="margin-left:8px;font-size:13px;color:var(--gray-500)">Job: <strong class="text-primary">${j.jobNumber}</strong></span>` : ''}
          ${inv ? `<span style="margin-left:8px;font-size:13px;color:var(--gray-500)">Invoice: <strong class="text-primary">${inv.invoiceNumber}</strong></span>` : ''}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
          <!-- Job Info -->
          <div class="card">
            <div class="card-header"><h3>Job Information</h3>
              <button class="btn btn-outline btn-sm" onclick="APP.Jobs.showModal('${j.id}')">Edit</button>
            </div>
            <div class="card-body">
              <div class="detail-item" style="margin-bottom:14px"><label>Service Type</label><span>${j.serviceType}</span></div>
              <div class="detail-item" style="margin-bottom:14px"><label>Date</label><span>${S().formatDate(j.date)}</span></div>
              <div class="detail-item" style="margin-bottom:14px"><label>Technician</label><span>${tech ? tech.name : '—'}</span></div>
              <div class="detail-item"><label>Description</label><span>${j.description}</span></div>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="card">
            <div class="card-header"><h3>Customer</h3>
              ${cust ? `<button class="btn btn-outline btn-sm" onclick="APP.Router.navigate('customers','detail','${cust.id}')">View</button>` : ''}
            </div>
            <div class="card-body">
              ${cust ? `
                <div class="detail-item" style="margin-bottom:14px"><label>Name</label><span>${cust.name}</span></div>
                <div class="detail-item" style="margin-bottom:14px"><label>Phone</label><span>${cust.phone}</span></div>
                <div class="detail-item" style="margin-bottom:14px"><label>Address</label><span>${cust.address}</span></div>
                <div class="detail-item"><label>Notes</label><span>${cust.notes || '—'}</span></div>
              ` : '<p class="text-muted">Customer not found</p>'}
            </div>
          </div>

          <!-- Cost Breakdown -->
          <div class="card">
            <div class="card-header"><h3>Cost Breakdown</h3></div>
            <div class="card-body">
              <div class="pricing-breakdown">
                <div class="pricing-row"><span>Parts Cost</span><span>${S().formatCurrency(j.partsCost || 0)}</span></div>
                <div class="pricing-row"><span>Labor Cost</span><span>${S().formatCurrency(j.laborCost || 0)}</span></div>
                <div class="pricing-row"><span>Transport Cost</span><span>${S().formatCurrency(j.transportCost || 0)}</span></div>
                <div class="pricing-row subtotal"><span>Subtotal</span><span>${S().formatCurrency(pricing.subtotal)}</span></div>
                <div class="pricing-row"><span>Overhead (${j.overheadPercent || 10}%)</span><span>${S().formatCurrency(pricing.overheadAmount)}</span></div>
                <div class="pricing-row"><span>Profit (${j.profitPercent || 30}%)</span><span>${S().formatCurrency(pricing.profitAmount)}</span></div>
                <div class="pricing-row total"><span>Final Price</span><span>${S().formatCurrency(pricing.total)}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="btn-group mt-20">
          ${j.status !== 'Completed' ? `<button class="btn btn-success" onclick="APP.Jobs.advanceStatus('${j.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>
            ${j.status === 'Pending' ? 'Start Job' : 'Complete Job'}
          </button>` : ''}
          <button class="btn btn-outline" onclick="APP.Router.navigate('documents','jobsheet','${j.id}')" style="border-color:var(--primary-500);color:var(--primary-500)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Job Sheet
          </button>
          ${!inv ? `<button class="btn btn-primary" onclick="APP.Invoices.generateFromJob('${j.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Generate Invoice
          </button>` : `<button class="btn btn-outline" onclick="APP.Router.navigate('invoices','detail','${inv.id}')">View Invoice (${inv.invoiceNumber})</button>`}
          <button class="btn btn-outline" onclick="APP.Router.navigate('documents','upload','${j.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Signed Doc
          </button>
          <button class="btn btn-outline" onclick="APP.Router.navigate('pricing')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Pricing Calculator
          </button>
          ${cust ? `<a class="btn btn-outline" href="https://wa.me/${cust.phone.replace(/^0/,'94')}?text=${encodeURIComponent('Hi ' + cust.name + ', this is CD Engineering regarding your ' + j.serviceType.toLowerCase() + ' job.')}" target="_blank">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg> WhatsApp
          </a>` : ''}
          ${APP.Auth.isAdmin() ? `<button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger)" onclick="APP.Jobs.confirmDelete('${j.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete Job
          </button>` : ''}
        </div>

        <!-- Signed Documents Section -->
        <div class="card mt-20" id="jobDocsSection">
          <div class="card-header">
            <h3>Signed Documents</h3>
            <button class="btn btn-outline btn-sm" onclick="APP.Router.navigate('documents','upload','${j.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload
            </button>
          </div>
          <div class="card-body compact" id="jobDocsContent">
            <div class="empty-state" style="padding:24px"><p class="text-muted">Loading...</p></div>
          </div>
        </div>
      </div>`;

    // Load signed documents async
    loadJobDocuments(j.id);
  }

  async function loadJobDocuments(jobId) {
    const docs = await S().getDocumentsByJob(jobId);
    const container = document.getElementById('jobDocsContent');
    if (!container) return;
    if (!docs.length) {
      container.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-state-icon" style="width:48px;height:48px;margin-bottom:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p class="text-muted" style="font-size:13px">No signed documents uploaded for this job.</p></div>';
    } else {
      container.innerHTML = APP.Documents.buildInlineDocGallery(docs);
    }
  }

  async function advanceStatus(id) {
    const j = S().getJob(id);
    if (!j) return;
    const next = j.status === 'Pending' ? 'In Progress' : 'Completed';
    const updated = await S().updateJob(id, { status: next });
    if (updated) {
      APP.toast(`Job status updated to "${next}"`);
      const hash = window.location.hash;
      if (hash.includes('detail')) renderDetail(id);
      else renderList();
    }
  }

  function confirmDelete(id) {
    const j = S().getJob(id);
    if (!j) return;
    const cust = S().getCustomer(j.customerId);
    const inv = S().getInvoiceByJob(id);
    let msg = `This will permanently delete the ${j.serviceType.toLowerCase()} job for "${cust ? cust.name : 'Unknown'}"`;
    if (inv) msg += ` and its linked invoice <strong>${inv.invoiceNumber}</strong>`;
    msg += '. This cannot be undone.';
    APP.confirm({
      title: 'Delete Job?',
      message: msg,
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        // Also delete linked invoice if exists
        if (inv) await S().updateInvoice(inv.id, { jobId: null });
        await S().deleteJob(id);
        APP.toast('Job deleted');
        APP.Router.navigate('jobs');
      }
    });
  }

  function showModal(editId) { _openModal(editId, null); }
  function showModalForCustomer(customerId) { _openModal(null, customerId); }

  function _openModal(editId, presetCustomerId) {
    const j = editId ? S().getJob(editId) : null;
    const customers = S().getCustomers().sort((a, b) => a.name.localeCompare(b.name));
    const technicians = S().getTechnicians().sort((a, b) => a.name.localeCompare(b.name));
    const services = S().getServices().sort((a, b) => a.name.localeCompare(b.name));
    const lorries = S().getLorries().sort((a, b) => a.lorryNumber.localeCompare(b.lorryNumber));
    const selectedCust = j ? j.customerId : (presetCustomerId || '');

    const custOptions = customers.map(c => `<option value="${c.id}" ${selectedCust === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    const techOptions = technicians.map(t => `<option value="${t.id}" ${j && j.technicianId === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
    const srvOptions = services.map(s => `<option value="${s.id}" data-name="${s.name}" data-price="${s.standardPrice}" ${j && j.serviceId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    const lorryOptions = lorries.map(l => `<option value="${l.id}" ${j && j.lorryId === l.id ? 'selected' : ''}>${l.lorryNumber} (${l.assignedArea||''})</option>`).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'jobModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:640px">
        <div class="modal-header"><h3>${j ? 'Edit' : 'New'} Job</h3><button class="modal-close" onclick="APP.Jobs.closeModal()">&times;</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label>Customer *</label><select class="form-control" id="jobCustomer"><option value="">Select customer</option>${custOptions}</select></div>
            <div class="form-group"><label>Service Type *</label><select class="form-control" id="jobServiceId" onchange="APP.Jobs.onServiceChange()">
              <option value="">Select Service</option>
              ${srvOptions}
            </select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Assigned Lorry</label><select class="form-control" id="jobLorry"><option value="">-- None --</option>${lorryOptions}</select></div>
            <div class="form-group"><label>Technician</label><select class="form-control" id="jobTech"><option value="">Select</option>${techOptions}</select></div>
          </div>
          <div class="form-group"><label>Description</label><textarea class="form-control" id="jobDesc" placeholder="Job description...">${j ? j.description : ''}</textarea></div>
          <div class="form-row-3">
            <div class="form-group"><label>Status</label><select class="form-control" id="jobStatus">
              <option value="Pending" ${j&&j.status==='Pending'?'selected':''}>Pending</option>
              <option value="In Progress" ${j&&j.status==='In Progress'?'selected':''}>In Progress</option>
              <option value="Completed" ${j&&j.status==='Completed'?'selected':''}>Completed</option>
            </select></div>
            <div class="form-group"><label>Date *</label><input class="form-control" type="date" id="jobDate" value="${j ? j.date : new Date().toISOString().split('T')[0]}"></div>
          </div>
          <hr style="border:none;border-top:1px solid var(--gray-200);margin:8px 0 16px">
          <p style="font-size:13px;font-weight:600;color:var(--gray-600);margin-bottom:12px">Cost Details</p>
          <div class="form-row-3">
            <div class="form-group"><label>Parts Cost (Rs.)</label><input class="form-control" type="number" id="jobParts" value="${j ? j.partsCost||'' : ''}" placeholder="0"></div>
            <div class="form-group"><label>Labor Cost (Rs.)</label><input class="form-control" type="number" id="jobLabor" value="${j ? j.laborCost||'' : ''}" placeholder="0"></div>
            <div class="form-group"><label>Transport (Rs.)</label><input class="form-control" type="number" id="jobTransport" value="${j ? j.transportCost||'' : ''}" placeholder="0"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Overhead %</label><input class="form-control" type="number" id="jobOverhead" value="${j ? j.overheadPercent||10 : 10}"></div>
            <div class="form-group"><label>Profit Margin %</label><input class="form-control" type="number" id="jobProfit" value="${j ? j.profitPercent||30 : 30}"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="APP.Jobs.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Jobs.saveJob('${editId || ''}')">${j ? 'Update' : 'Create'} Job</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }

  function closeModal() { const m = document.getElementById('jobModal'); if (m) m.remove(); }

  function onServiceChange() {
    const select = document.getElementById('jobServiceId');
    const opt = select.options[select.selectedIndex];
    if (opt && opt.dataset.price) {
      const laborInput = document.getElementById('jobLabor');
      if (laborInput && !laborInput.value) laborInput.value = opt.dataset.price;
    }
  }

  async function saveJob(editId) {
    const customerId = document.getElementById('jobCustomer').value;
    
    const serviceSelect = document.getElementById('jobServiceId');
    const serviceId = serviceSelect.value;
    const serviceType = serviceSelect.options[serviceSelect.selectedIndex]?.dataset.name || 'General';
    const lorryId = document.getElementById('jobLorry').value;
    
    const description = document.getElementById('jobDesc').value.trim();
    const technicianId = document.getElementById('jobTech').value;
    const status = document.getElementById('jobStatus').value;
    const date = document.getElementById('jobDate').value;
    const partsCost = parseFloat(document.getElementById('jobParts').value) || 0;
    const laborCost = parseFloat(document.getElementById('jobLabor').value) || 0;
    const transportCost = parseFloat(document.getElementById('jobTransport').value) || 0;
    const overheadPercent = parseFloat(document.getElementById('jobOverhead').value) || 10;
    const profitPercent = parseFloat(document.getElementById('jobProfit').value) || 30;

    if (!customerId || !date || !serviceId) { APP.toast('Please select a customer, service, and date', 'error'); return; }
    if (partsCost < 0 || laborCost < 0 || transportCost < 0 || overheadPercent < 0 || profitPercent < 0) { APP.toast('Costs and percentages cannot be negative', 'error'); return; }

    const jobData = { customerId, serviceId, lorryId, serviceType, description, technicianId, status, date, partsCost, laborCost, transportCost, overheadPercent, profitPercent };
    let success = false;
    if (editId) {
      const r = await S().updateJob(editId, jobData);
      if (r) { APP.toast('Job updated'); success = true; }
    } else {
      const r = await S().addJob(jobData);
      if (r) { APP.toast('Job created'); success = true; }
    }
    if (success) {
      closeModal();
      renderList();
    }
  }

  return { render, filter, search, showModal, showModalForCustomer, closeModal, saveJob, advanceStatus, confirmDelete, onServiceChange };
})();
