/* =========================================================
   CD Engineering — Data Store (API Client v3.0)
   Replaces localStorage with REST API calls to backend
   ========================================================= */
window.APP = window.APP || {};

APP.Store = (function () {
  // ── Local Cache ─────────────────────────────────────────
  let cache = { customers: [], jobs: [], invoices: [], technicians: [], quotations: [], lorries: [], services: [], parts: [], documents: [], branches: [], bills: [] };
  let _stats = {};
  let _monthlyRevenue = { labels: [], revenue: [], profit: [], cost: [] };

  // ── API Helper ──────────────────────────────────────────
  async function api(url, opts) {
    opts = opts || {};
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
    const resp = await fetch(url, opts);
    if (resp.status === 401) {
      // Session expired — redirect to login
      APP.Auth.showLogin('Your session has expired. Please log in again.');
      throw new Error('SESSION_EXPIRED');
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return resp.json();
  }

  // ── Bootstrap: Load all data ────────────────────────────
  async function loadAll() {
    try {
      const [customers, jobs, invoices, technicians, quotations, lorries, services, parts, stats, monthly, branches, bills] = await Promise.all([
        api('/api/customers'),
        api('/api/jobs'),
        api('/api/invoices'),
        api('/api/technicians'),
        api('/api/quotations'),
        api('/api/lorries'),
        api('/api/services'),
        api('/api/parts'),
        api('/api/stats'),
        api('/api/stats/monthly-revenue'),
        api('/api/branches'),
        api('/api/bills'),
      ]);
      cache.customers = customers.map(mapCustomerFromApi);
      cache.jobs = jobs.map(mapJobFromApi);
      cache.invoices = invoices;
      cache.technicians = technicians.map(mapTechFromApi);
      cache.quotations = quotations;
      cache.lorries = lorries.map(mapLorryFromApi);
      cache.services = services.map(mapServiceFromApi);
      cache.parts = parts.map(mapPartFromApi);
      cache.branches = branches;
      cache.bills = bills;
      _stats = stats;
      _monthlyRevenue = monthly;
    } catch (e) {
      if (e.message !== 'SESSION_EXPIRED') console.error('Store loadAll failed:', e);
    }
  }

  // ── Map API snake_case → frontend camelCase ─────────────
  function mapCustomerFromApi(c) {
    return { id: c.id, name: c.name, phone: c.phone, address: c.address, notes: c.notes,
      createdAt: c.created_at || c.createdAt, updatedAt: c.updated_at || c.updatedAt };
  }
  function mapJobFromApi(j) {
    if (!j) return null;
    if (j.customerId) return j; // already mapped
    return { id: j.id, jobNumber: j.job_number || j.jobNumber, customerId: j.customer_id, serviceId: j.service_id, lorryId: j.lorry_id, serviceType: j.service_type, description: j.description,
      technicianId: j.technician_id, status: j.status, date: j.date, partsCost: j.parts_cost, laborCost: j.labor_cost,
      transportCost: j.transport_cost, overheadPercent: j.overhead_percent, profitPercent: j.profit_percent,
      branchId: j.branch_id || j.branchId || '',
      createdAt: j.created_at, updatedAt: j.updated_at };
  }
  function mapTechFromApi(t) {
    if (!t) return null;
    return { id: t.id, name: t.name, phone: t.phone, specialization: t.specialization, role: t.role, lorryId: t.lorry_id,
      createdAt: t.created_at || t.createdAt, updatedAt: t.updated_at || t.updatedAt };
  }
  function mapLorryFromApi(l) {
    if (!l) return null;
    return { id: l.id, lorryNumber: l.lorry_number, assignedArea: l.assigned_area, status: l.status, createdAt: l.created_at || l.createdAt };
  }
  function mapServiceFromApi(s) {
    if (!s) return null;
    return { id: s.id, name: s.name, description: s.description, standardPrice: s.standard_price, durationEstimate: s.duration_estimate, category: s.category || 'General', createdAt: s.created_at || s.createdAt };
  }
  function mapPartFromApi(p) {
    if (!p) return null;
    return { id: p.id, name: p.name, category: p.category, unitPrice: p.unit_price, stock: p.stock, createdAt: p.created_at || p.createdAt };
  }

  // ── Refresh helpers ─────────────────────────────────────
  async function refreshStats() {
    try {
      _stats = await api('/api/stats');
      _monthlyRevenue = await api('/api/stats/monthly-revenue');
    } catch (e) {}
  }

  // ── Core Pricing Formula (client-side mirror) ───────────
  function calculatePricing(parts, labor, transport, overheadPct, profitPct) {
    parts = parseFloat(parts) || 0; labor = parseFloat(labor) || 0; transport = parseFloat(transport) || 0;
    overheadPct = parseFloat(overheadPct) || 0; profitPct = parseFloat(profitPct) || 0;
    const subtotal = parts + labor + transport;
    const afterOverhead = subtotal * (1 + overheadPct / 100);
    const overheadAmount = afterOverhead - subtotal;
    const total = afterOverhead * (1 + profitPct / 100);
    const profitAmount = total - afterOverhead;
    return {
      subtotal: Math.round(subtotal * 100) / 100, overheadAmount: Math.round(overheadAmount * 100) / 100,
      afterOverhead: Math.round(afterOverhead * 100) / 100, profitAmount: Math.round(profitAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  function buildInvoiceFromJob(job) {
    const r = calculatePricing(job.partsCost, job.laborCost, job.transportCost, job.overheadPercent, job.profitPercent);
    return { partsCost: job.partsCost||0, laborCost: job.laborCost||0, transportCost: job.transportCost||0,
      overheadPercent: job.overheadPercent||10, profitPercent: job.profitPercent||30,
      subtotal: r.subtotal, overheadAmount: r.overheadAmount, profitAmount: r.profitAmount, total: r.total };
  }

  // ── Customers (sync reads from cache, async writes) ─────
  function getCustomers() { return [...cache.customers]; }
  function getCustomer(id) { return cache.customers.find(c => c.id === id) || null; }
  function searchCustomers(q) { q = q.toLowerCase(); return cache.customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q)); }
  function getJobsByCustomer(cid) { return cache.jobs.filter(j => j.customerId === cid); }
  function getInvoicesByCustomer(cid) { return cache.invoices.filter(i => i.customerId === cid); }
  function getCustomerLinkedCounts(cid) {
    return { jobCount: cache.jobs.filter(j => j.customerId === cid).length, invCount: cache.invoices.filter(i => i.customerId === cid).length };
  }
  async function addCustomer(c) {
    try { const r = await api('/api/customers', { method: 'POST', body: c }); cache.customers.push(mapCustomerFromApi(r)); await refreshStats(); return mapCustomerFromApi(r); }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function updateCustomer(id, c) {
    try { const r = await api('/api/customers/' + id, { method: 'PUT', body: c }); const idx = cache.customers.findIndex(x => x.id === id); if (idx >= 0) cache.customers[idx] = mapCustomerFromApi(r); return mapCustomerFromApi(r); }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function deleteCustomer(id) {
    try { await api('/api/customers/' + id, { method: 'DELETE' }); cache.customers = cache.customers.filter(x => x.id !== id); await refreshStats(); }
    catch (e) { APP.toast(e.message, 'error'); }
  }

  // ── Jobs ────────────────────────────────────────────────
  function getJobs() { return [...cache.jobs]; }
  function getJob(id) { return cache.jobs.find(j => j.id === id) || null; }
  function getJobsByTechnician(tid) { return cache.jobs.filter(j => j.technicianId === tid); }
  function getJobsByStatus(s) { return cache.jobs.filter(j => j.status === s); }
  async function addJob(j) {
    try { const r = await api('/api/jobs', { method: 'POST', body: j }); cache.jobs.push(mapJobFromApi(r)); await refreshStats(); return mapJobFromApi(r); }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function updateJob(id, j) {
    try { const r = await api('/api/jobs/' + id, { method: 'PUT', body: j }); const idx = cache.jobs.findIndex(x => x.id === id); if (idx >= 0) cache.jobs[idx] = mapJobFromApi(r); await refreshStats(); return mapJobFromApi(r); }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function deleteJob(id) {
    try { await api('/api/jobs/' + id, { method: 'DELETE' }); cache.jobs = cache.jobs.filter(x => x.id !== id); cache.invoices = cache.invoices.filter(i => i.jobId !== id); await refreshStats(); }
    catch (e) { APP.toast(e.message, 'error'); }
  }

  // ── Invoices ────────────────────────────────────────────
  function getInvoices() { return [...cache.invoices]; }
  function getInvoice(id) { return cache.invoices.find(i => i.id === id) || null; }
  function getInvoiceByJob(jid) { return cache.invoices.find(i => i.jobId === jid) || null; }
  async function addInvoice(inv) {
    try { const r = await api('/api/invoices', { method: 'POST', body: inv }); cache.invoices.push(r); await refreshStats(); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function updateInvoice(id, inv) {
    try { const r = await api('/api/invoices/' + id, { method: 'PUT', body: inv }); const idx = cache.invoices.findIndex(x => x.id === id); if (idx >= 0) cache.invoices[idx] = r; await refreshStats(); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }

  // ── Technicians ─────────────────────────────────────────
  function getTechnicians() { return [...cache.technicians]; }
  function getTechnician(id) { return cache.technicians.find(t => t.id === id) || null; }
  function getTechnicianLinkedCounts(tid) { return { jobCount: cache.jobs.filter(j => j.technicianId === tid).length }; }
  async function addTechnician(t) {
    try { const r = await api('/api/technicians', { method: 'POST', body: t }); cache.technicians.push(mapTechFromApi(r)); return mapTechFromApi(r); }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function updateTechnician(id, t) {
    try { const r = await api('/api/technicians/' + id, { method: 'PUT', body: t }); const idx = cache.technicians.findIndex(x => x.id === id); if (idx >= 0) cache.technicians[idx] = mapTechFromApi(r); return mapTechFromApi(r); }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function deleteTechnician(id) {
    try { await api('/api/technicians/' + id, { method: 'DELETE' }); cache.technicians = cache.technicians.filter(x => x.id !== id); }
    catch (e) { APP.toast(e.message, 'error'); }
  }

  // ── Quotations ──────────────────────────────────────────
  function getQuotations() { return [...cache.quotations]; }
  function getQuotation(id) { return cache.quotations.find(q => q.id === id) || null; }
  async function addQuotation(q) {
    try { const r = await api('/api/quotations', { method: 'POST', body: q }); cache.quotations.push(r); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }

  // ── Lorries ───────────────────────────────────────────────
  const getLorries = () => cache.lorries;
  const getLorry = id => cache.lorries.find(l => l.id === id);
  async function addLorry(l) {
    const res = await api('/api/lorries', { method: 'POST', body: l });
    cache.lorries.push(mapLorryFromApi(res));
  }
  async function updateLorry(id, updates) {
    const res = await api(`/api/lorries/${id}`, { method: 'PUT', body: updates });
    cache.lorries = cache.lorries.map(l => l.id === id ? mapLorryFromApi(res) : l);
  }
  async function deleteLorry(id) {
    await api(`/api/lorries/${id}`, { method: 'DELETE' });
    cache.lorries = cache.lorries.filter(l => l.id !== id);
    // Unassign technicians
    cache.technicians = cache.technicians.map(t => t.lorryId === id ? { ...t, lorryId: '' } : t);
  }

  // ── Services ──────────────────────────────────────────────
  const getServices = () => cache.services;
  const getService = id => cache.services.find(s => s.id === id);
  async function addService(s) {
    const res = await api('/api/services', { method: 'POST', body: s });
    cache.services.push(mapServiceFromApi(res));
  }
  async function updateService(id, updates) {
    const res = await api(`/api/services/${id}`, { method: 'PUT', body: updates });
    cache.services = cache.services.map(s => s.id === id ? mapServiceFromApi(res) : s);
  }
  async function deleteService(id) {
    await api(`/api/services/${id}`, { method: 'DELETE' });
    cache.services = cache.services.filter(s => s.id !== id);
  }

  // ── Parts ─────────────────────────────────────────────────
  const getParts = () => cache.parts;
  const getPart = id => cache.parts.find(p => p.id === id);
  async function addPart(p) {
    const res = await api('/api/parts', { method: 'POST', body: p });
    cache.parts.push(mapPartFromApi(res));
  }
  async function updatePart(id, updates) {
    const res = await api(`/api/parts/${id}`, { method: 'PUT', body: updates });
    cache.parts = cache.parts.map(p => p.id === id ? mapPartFromApi(res) : p);
  }
  async function deletePart(id) {
    await api(`/api/parts/${id}`, { method: 'DELETE' });
    cache.parts = cache.parts.filter(p => p.id !== id);
  }

  // ── Stats (from cache) ─────────────────────────────────
  function getStats() { return { ..._stats }; }
  function getMonthlyRevenue() { return { ..._monthlyRevenue }; }

  // ── Utilities ───────────────────────────────────────────
  function formatCurrency(a) { return 'Rs. ' + Number(a).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  async function resetData() {
    try { await api('/api/backup/reset-demo', { method: 'POST' }); await loadAll(); }
    catch (e) { APP.toast(e.message, 'error'); }
  }
  function generateId() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9); }

  // ── Signed Documents ─────────────────────────────────────
  async function getDocumentsByJob(jobId) {
    try { return await api('/api/documents?jobId=' + jobId); }
    catch (e) { return []; }
  }
  async function getDocumentsByCustomer(customerId) {
    try { return await api('/api/documents?customerId=' + customerId); }
    catch (e) { return []; }
  }
  async function getAllDocuments() {
    try { return await api('/api/documents'); }
    catch (e) { return []; }
  }
  async function uploadDocument(formData) {
    try {
      const resp = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      if (resp.status === 401) { APP.Auth.showLogin('Session expired.'); throw new Error('SESSION_EXPIRED'); }
      if (!resp.ok) { const err = await resp.json().catch(() => ({ error: 'Upload failed' })); throw new Error(err.error); }
      return await resp.json();
    } catch (e) { if (e.message !== 'SESSION_EXPIRED') APP.toast(e.message, 'error'); return null; }
  }
  async function deleteDocument(id) {
    try { await api('/api/documents/' + id, { method: 'DELETE' }); }
    catch (e) { APP.toast(e.message, 'error'); }
  }

  // ── Job Parts (for itemized documents) ──────────────────
  async function getJobParts(jobId) {
    try { return await api('/api/jobs/' + jobId + '/parts'); }
    catch (e) { return []; }
  }

  // ── Branches ─────────────────────────────────────────────
  function getBranches() { return [...cache.branches]; }
  function getBranch(id) { return cache.branches.find(b => b.id === id) || null; }
  async function addBranch(b) {
    try { const r = await api('/api/branches', { method: 'POST', body: b }); cache.branches.push(r); await refreshStats(); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function updateBranch(id, b) {
    try { const r = await api('/api/branches/' + id, { method: 'PUT', body: b }); const idx = cache.branches.findIndex(x => x.id === id); if (idx >= 0) cache.branches[idx] = r; await refreshStats(); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function deleteBranch(id) {
    try { await api('/api/branches/' + id, { method: 'DELETE' }); cache.branches = cache.branches.filter(x => x.id !== id); await refreshStats(); }
    catch (e) { APP.toast(e.message, 'error'); }
  }

  // ── Bills / Expenses ─────────────────────────────────────
  function getBills() { return [...cache.bills]; }
  async function addBill(b) {
    try { const r = await api('/api/bills', { method: 'POST', body: b }); cache.bills.push(r); await refreshStats(); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function updateBill(id, b) {
    try { const r = await api('/api/bills/' + id, { method: 'PUT', body: b }); const idx = cache.bills.findIndex(x => x.id === id); if (idx >= 0) cache.bills[idx] = r; await refreshStats(); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function deleteBill(id) {
    try { await api('/api/bills/' + id, { method: 'DELETE' }); cache.bills = cache.bills.filter(x => x.id !== id); await refreshStats(); }
    catch (e) { APP.toast(e.message, 'error'); }
  }

  // ── Lorry Daily Logs ─────────────────────────────────────
  async function getLorryLogs(lorryId) {
    try { return await api('/api/lorries/' + lorryId + '/logs'); }
    catch (e) { return []; }
  }
  async function addLorryLog(lorryId, log) {
    try { const r = await api('/api/lorries/' + lorryId + '/logs', { method: 'POST', body: log }); await refreshStats(); return r; }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }
  async function deleteLorryLog(lorryId, logId) {
    try { await api('/api/lorries/' + lorryId + '/logs/' + logId, { method: 'DELETE' }); await refreshStats(); }
    catch (e) { APP.toast(e.message, 'error'); }
  }

  // ── Invoice Items ────────────────────────────────────────
  async function getInvoiceItems(invoiceId) {
    try { return await api('/api/invoices/' + invoiceId + '/items'); }
    catch (e) { return []; }
  }

  // ── Bank Email processing ────────────────────────────────
  async function processBankEmail(emailText) {
    try { return await api('/api/invoices/process-email', { method: 'POST', body: { emailText } }); }
    catch (e) { APP.toast(e.message, 'error'); return null; }
  }

  // ── Public API (same surface as localStorage version) ───
  return {
    loadAll, refreshStats, calculatePricing, buildInvoiceFromJob, generateId,
    getCustomers, getCustomer, addCustomer, updateCustomer, deleteCustomer, searchCustomers,
    getJobsByCustomer, getInvoicesByCustomer, getCustomerLinkedCounts,
    getJobs, getJob, addJob, updateJob, deleteJob, getJobsByTechnician, getJobsByStatus,
    getTechnicians, getTechnician, addTechnician, updateTechnician, deleteTechnician, getTechnicianLinkedCounts,
    getInvoices, getInvoice, addInvoice, updateInvoice, getInvoiceByJob,
    getQuotations, getQuotation, addQuotation,
    getLorries, getLorry, addLorry, updateLorry, deleteLorry,
    getServices, getService, addService, updateService, deleteService,
    getParts, getPart, addPart, updatePart, deletePart,
    getDocumentsByJob, getDocumentsByCustomer, getAllDocuments, uploadDocument, deleteDocument,
    getJobParts,
    getBranches, getBranch, addBranch, updateBranch, deleteBranch,
    getBills, addBill, updateBill, deleteBill,
    getLorryLogs, addLorryLog, deleteLorryLog,
    getInvoiceItems, processBankEmail,
    getStats, getMonthlyRevenue, formatCurrency, formatDate, resetData,
    on: () => {}, emit: () => {}, // Kept for backwards compat — no-op
  };
})();
