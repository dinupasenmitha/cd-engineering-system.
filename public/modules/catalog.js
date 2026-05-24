/* =========================================================
   CD Engineering — Catalog Module (Services & Parts) — Fixed
   ========================================================= */
window.APP = window.APP || {};

APP.Catalog = (function () {
  const S = () => APP.Store;
  let activeTab = 'services';
  let sortState = { services: { key: 'name', asc: true }, parts: { key: 'name', asc: true } };

  function render(action, id) {
    const container = document.getElementById('main-content');
    if (!container) return;

    const services = S().getServices().slice();
    const parts = S().getParts().slice();

    // Sorting
    services.sort((a, b) => {
      let v1 = (a[sortState.services.key] || '').toString().toLowerCase();
      let v2 = (b[sortState.services.key] || '').toString().toLowerCase();
      if (sortState.services.key === 'standardPrice') { v1 = Number(a.standardPrice) || 0; v2 = Number(b.standardPrice) || 0; }
      if (v1 < v2) return sortState.services.asc ? -1 : 1;
      if (v1 > v2) return sortState.services.asc ? 1 : -1;
      return 0;
    });

    parts.sort((a, b) => {
      let v1 = (a[sortState.parts.key] || '').toString().toLowerCase();
      let v2 = (b[sortState.parts.key] || '').toString().toLowerCase();
      if (sortState.parts.key === 'unitPrice') { v1 = Number(a.unitPrice) || 0; v2 = Number(b.unitPrice) || 0; }
      if (sortState.parts.key === 'stock') { v1 = Number(a.stock) || 0; v2 = Number(b.stock) || 0; }
      if (v1 < v2) return sortState.parts.asc ? -1 : 1;
      if (v1 > v2) return sortState.parts.asc ? 1 : -1;
      return 0;
    });

    // Stats
    const totalServiceValue = services.reduce((s, sv) => s + (Number(sv.standardPrice) || 0), 0);
    const totalPartsValue = parts.reduce((s, p) => s + ((Number(p.unitPrice) || 0) * (Number(p.stock) || 0)), 0);
    const lowStockParts = parts.filter(p => (Number(p.stock) || 0) <= 5);

    let html = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Service & Parts Catalog</h1><p>Manage standard services, pricing, and parts inventory</p></div>
            <div class="btn-group">
              <button class="btn ${activeTab === 'services' ? 'btn-primary' : 'btn-outline'}" onclick="APP.Catalog.setTab('services')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                Services (${services.length})
              </button>
              <button class="btn ${activeTab === 'parts' ? 'btn-primary' : 'btn-outline'}" onclick="APP.Catalog.setTab('parts')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Parts (${parts.length})
              </button>
            </div>
          </div>
        </div>

        <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="kpi-card">
            <div class="kpi-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
            <div class="kpi-info"><h4>Total Services</h4><div class="kpi-value">${services.length}</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <div class="kpi-info"><h4>Avg Service Price</h4><div class="kpi-value" style="font-size:18px">${services.length ? S().formatCurrency(totalServiceValue / services.length) : '—'}</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
            <div class="kpi-info"><h4>Inventory Value</h4><div class="kpi-value" style="font-size:18px">${S().formatCurrency(totalPartsValue)}</div><div class="kpi-sub">${parts.length} parts in stock</div></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon ${lowStockParts.length ? 'amber' : 'green'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
            <div class="kpi-info"><h4>Low Stock</h4><div class="kpi-value">${lowStockParts.length}</div><div class="kpi-sub">${lowStockParts.length ? 'parts need restocking' : 'all stocked'}</div></div>
          </div>
        </div>`;

    if (activeTab === 'services') {
      html += buildServicesTab(services);
    } else {
      html += buildPartsTab(parts);
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  function buildServicesTab(services) {
    let html = `
      <div class="card">
        <div class="card-header">
          <h3>Services Catalog</h3>
          ${APP.Auth.isAdmin() ? `<button class="btn btn-primary btn-sm" onclick="APP.Catalog.openServiceModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Service
          </button>` : ''}
        </div>
        <div class="card-body compact">`;

    if (services.length === 0) {
      html += '<div class="empty-state"><h3>No services yet</h3><p>Add your first service to the catalog.</p></div>';
    } else {
      html += `<table class="data-table"><thead><tr>
        <th onclick="APP.Catalog.sort('services','name')" style="cursor:pointer">Service Name ${sortIcon('services', 'name')}</th>
        <th>Category</th>
        <th>Description</th>
        <th onclick="APP.Catalog.sort('services','durationEstimate')" style="cursor:pointer">Est. Time ${sortIcon('services', 'durationEstimate')}</th>
        <th onclick="APP.Catalog.sort('services','standardPrice')" style="cursor:pointer;text-align:right">Standard Price ${sortIcon('services', 'standardPrice')}</th>
        <th style="width:100px;text-align:right">Actions</th>
      </tr></thead><tbody>`;

      services.forEach(s => {
        html += `<tr>
          <td><strong>${s.name}</strong></td>
          <td><span class="badge" style="font-size:11px;background:var(--primary-100);color:var(--primary-600)">${s.category || 'General'}</span></td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.description || '—'}</td>
          <td>${s.durationEstimate || '—'}</td>
          <td class="text-right"><strong>${S().formatCurrency(s.standardPrice)}</strong></td>
          <td style="text-align:right">
            <div class="btn-group" style="justify-content:flex-end">
              <button class="btn-icon" onclick="APP.Catalog.openServiceModal('${s.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              ${APP.Auth.isAdmin() ? `<button class="btn-icon" onclick="APP.Catalog.deleteService('${s.id}')" title="Delete" style="color:var(--danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
            </div>
          </td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</div></div>`;
    return html;
  }

  function buildPartsTab(parts) {
    let html = `
      <div class="card">
        <div class="card-header">
          <h3>Parts Inventory</h3>
          ${APP.Auth.isAdmin() ? `<button class="btn btn-primary btn-sm" onclick="APP.Catalog.openPartModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Part
          </button>` : ''}
        </div>
        <div class="card-body compact">`;

    if (parts.length === 0) {
      html += '<div class="empty-state"><h3>No parts yet</h3><p>Add your first part to the inventory.</p></div>';
    } else {
      html += `<table class="data-table"><thead><tr>
        <th onclick="APP.Catalog.sort('parts','name')" style="cursor:pointer">Part Name ${sortIcon('parts', 'name')}</th>
        <th onclick="APP.Catalog.sort('parts','category')" style="cursor:pointer">Category ${sortIcon('parts', 'category')}</th>
        <th onclick="APP.Catalog.sort('parts','stock')" style="cursor:pointer">Stock Level ${sortIcon('parts', 'stock')}</th>
        <th onclick="APP.Catalog.sort('parts','unitPrice')" style="cursor:pointer;text-align:right">Unit Price ${sortIcon('parts', 'unitPrice')}</th>
        <th style="width:100px;text-align:right">Actions</th>
      </tr></thead><tbody>`;

      parts.forEach(p => {
        const stockClass = (Number(p.stock) || 0) <= 5 ? 'color:var(--danger);font-weight:700' : '';
        const stockBadge = (Number(p.stock) || 0) <= 5 ? '<span class="badge" style="font-size:10px;background:var(--danger-bg);color:var(--danger-text);margin-left:6px">LOW</span>' : '';
        html += `<tr>
          <td><strong>${p.name}</strong></td>
          <td><span class="badge" style="font-size:11px;background:var(--gray-100);color:var(--gray-600)">${p.category || 'General'}</span></td>
          <td style="${stockClass}">${p.stock}${stockBadge}</td>
          <td class="text-right"><strong>${S().formatCurrency(p.unitPrice)}</strong></td>
          <td style="text-align:right">
            <div class="btn-group" style="justify-content:flex-end">
              <button class="btn-icon" onclick="APP.Catalog.openPartModal('${p.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              ${APP.Auth.isAdmin() ? `<button class="btn-icon" onclick="APP.Catalog.deletePart('${p.id}')" title="Delete" style="color:var(--danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
            </div>
          </td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</div></div>`;
    return html;
  }

  function sortIcon(tab, key) {
    if (sortState[tab].key !== key) return '<span style="opacity:0.2">↕</span>';
    return sortState[tab].asc ? '↑' : '↓';
  }

  function sort(tab, key) {
    if (sortState[tab].key === key) sortState[tab].asc = !sortState[tab].asc;
    else { sortState[tab].key = key; sortState[tab].asc = true; }
    render();
  }

  function setTab(tab) {
    activeTab = tab;
    render();
  }

  // ── Services Modal ────────────────────────────────────────
  function openServiceModal(id) {
    id = id || null;
    let s = id ? S().getService(id) : { name: '', description: '', standardPrice: '', durationEstimate: '1h', category: 'Repair' };
    if (!s) s = { name: '', description: '', standardPrice: '', durationEstimate: '1h', category: 'Repair' };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'catalogModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${id ? 'Edit' : 'Add'} Service</h3><button class="modal-close" onclick="APP.Catalog.closeModal()">&times;</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Service Name *</label>
            <input type="text" id="srv-name" value="${s.name}" class="form-control" required placeholder="e.g. AC Full Service">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select id="srv-category" class="form-control">
                <option value="Installation" ${s.category === 'Installation' ? 'selected' : ''}>Installation</option>
                <option value="Repair" ${s.category === 'Repair' ? 'selected' : ''}>Repair</option>
                <option value="Maintenance" ${s.category === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                <option value="Gas Refill" ${s.category === 'Gas Refill' ? 'selected' : ''}>Gas Refill</option>
                <option value="General" ${s.category === 'General' ? 'selected' : ''}>General</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estimated Duration</label>
              <input type="text" id="srv-time" value="${s.durationEstimate || ''}" class="form-control" placeholder="e.g. 2h">
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="srv-desc" class="form-control" rows="2" placeholder="Brief description of this service">${s.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Standard Price (LKR) *</label>
            <input type="number" id="srv-price" value="${s.standardPrice}" class="form-control" required min="0" placeholder="0">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="APP.Catalog.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Catalog.saveService('${id || ''}')">Save</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }

  async function saveService(id) {
    const name = document.getElementById('srv-name').value.trim();
    const description = document.getElementById('srv-desc').value.trim();
    const standardPrice = Number(document.getElementById('srv-price').value) || 0;
    const durationEstimate = document.getElementById('srv-time').value.trim();
    const category = document.getElementById('srv-category').value;

    if (!name) { APP.toast('Please enter a service name', 'error'); return; }

    try {
      if (id) {
        await S().updateService(id, { name, description, standardPrice, durationEstimate, category });
        APP.toast('Service updated');
      } else {
        await S().addService({ name, description, standardPrice, durationEstimate, category });
        APP.toast('Service added');
      }
      closeModal();
      render();
    } catch (e) { APP.toast(e.message, 'error'); }
  }

  async function deleteService(id) {
    APP.confirm({
      title: 'Delete Service?',
      message: 'Are you sure you want to delete this service from the catalog? This cannot be undone.',
      type: 'warn',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await S().deleteService(id);
          APP.toast('Service deleted');
          render();
        } catch (e) { APP.toast(e.message, 'error'); }
      }
    });
  }

  // ── Parts Modal ───────────────────────────────────────────
  function openPartModal(id) {
    id = id || null;
    let p = id ? S().getPart(id) : { name: '', category: '', unitPrice: '', stock: '' };
    if (!p) p = { name: '', category: '', unitPrice: '', stock: '' };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'catalogModal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>${id ? 'Edit' : 'Add'} Part</h3><button class="modal-close" onclick="APP.Catalog.closeModal()">&times;</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Part Name *</label>
            <input type="text" id="prt-name" value="${p.name}" class="form-control" required placeholder="e.g. R410A Gas Cylinder">
          </div>
          <div class="form-group">
            <label>Category</label>
            <select id="prt-cat" class="form-control">
              <option value="Compressor" ${p.category === 'Compressor' ? 'selected' : ''}>Compressor</option>
              <option value="Gas" ${p.category === 'Gas' ? 'selected' : ''}>Gas</option>
              <option value="Filter" ${p.category === 'Filter' ? 'selected' : ''}>Filter</option>
              <option value="Motor" ${p.category === 'Motor' ? 'selected' : ''}>Motor</option>
              <option value="PCB Board" ${p.category === 'PCB Board' ? 'selected' : ''}>PCB Board</option>
              <option value="Remote" ${p.category === 'Remote' ? 'selected' : ''}>Remote</option>
              <option value="Piping" ${p.category === 'Piping' ? 'selected' : ''}>Piping</option>
              <option value="Electrical" ${p.category === 'Electrical' ? 'selected' : ''}>Electrical</option>
              <option value="Other" ${p.category === 'Other' || !p.category ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Unit Price (LKR) *</label>
              <input type="number" id="prt-price" value="${p.unitPrice}" class="form-control" required min="0" placeholder="0">
            </div>
            <div class="form-group">
              <label>Stock Level *</label>
              <input type="number" id="prt-stock" value="${p.stock}" class="form-control" required min="0" placeholder="0">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="APP.Catalog.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Catalog.savePart('${id || ''}')">Save</button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }

  function closeModal() { const m = document.getElementById('catalogModal'); if (m) m.remove(); }

  async function savePart(id) {
    const name = document.getElementById('prt-name').value.trim();
    const category = document.getElementById('prt-cat').value;
    const unitPrice = Number(document.getElementById('prt-price').value) || 0;
    const stock = Number(document.getElementById('prt-stock').value) || 0;

    if (!name) { APP.toast('Please enter a part name', 'error'); return; }

    try {
      if (id) {
        await S().updatePart(id, { name, category, unitPrice, stock });
        APP.toast('Part updated');
      } else {
        await S().addPart({ name, category, unitPrice, stock });
        APP.toast('Part added');
      }
      closeModal();
      render();
    } catch (e) { APP.toast(e.message, 'error'); }
  }

  async function deletePart(id) {
    APP.confirm({
      title: 'Delete Part?',
      message: 'Are you sure you want to delete this part from the inventory? This cannot be undone.',
      type: 'warn',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await S().deletePart(id);
          APP.toast('Part deleted');
          render();
        } catch (e) { APP.toast(e.message, 'error'); }
      }
    });
  }

  return { render, sort, setTab, openServiceModal, saveService, deleteService, openPartModal, savePart, deletePart, closeModal };
})();
