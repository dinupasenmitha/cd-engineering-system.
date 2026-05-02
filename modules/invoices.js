/* =========================================================
   CD Engineering — Invoices Module (Production-Ready)
   ========================================================= */
window.APP = window.APP || {};

APP.Invoices = (function () {
  const S = () => APP.Store;
  let currentFilter = 'All';

  function render(action, id) {
    if (action === 'detail' && id) return renderDetail(id);
    renderList();
  }

  function renderList() {
    const allInvoices = S().getInvoices().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const invoices = currentFilter === 'All' ? allInvoices : allInvoices.filter(i => i.status === currentFilter);
    const stats = S().getStats();
    const paidCount = allInvoices.filter(i => i.status === 'Paid').length;
    const unpaidCount = allInvoices.filter(i => i.status === 'Unpaid').length;
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Invoices</h1><p>View and manage invoices</p></div>
            <div style="display:flex;gap:12px;align-items:center">
              <span class="text-muted" style="font-size:13px">${S().formatCurrency(stats.paidRevenue)} collected &nbsp;|&nbsp; ${S().formatCurrency(stats.unpaidRevenue)} unpaid</span>
            </div>
          </div>
        </div>
        <div class="toolbar">
          <div class="filter-tabs">
            <button class="filter-tab ${currentFilter==='All'?'active':''}" onclick="APP.Invoices.filter('All')">All (${allInvoices.length})</button>
            <button class="filter-tab ${currentFilter==='Unpaid'?'active':''}" onclick="APP.Invoices.filter('Unpaid')">Unpaid (${unpaidCount})</button>
            <button class="filter-tab ${currentFilter==='Paid'?'active':''}" onclick="APP.Invoices.filter('Paid')">Paid (${paidCount})</button>
          </div>
        </div>
        <div class="card">
          <div class="card-body compact">
            ${invoices.length ? buildTable(invoices) : '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h3>No invoices found</h3><p>Generate an invoice from a job detail page.</p></div>'}
          </div>
        </div>
      </div>`;
  }

  function buildTable(invoices) {
    const rows = invoices.map(inv => {
      const cust = S().getCustomer(inv.customerId);
      const job = S().getJob(inv.jobId);
      const bc = inv.status === 'Paid' ? 'badge-paid' : 'badge-unpaid';
      return `<tr class="clickable" onclick="APP.Router.navigate('invoices','detail','${inv.id}')">
        <td><strong>${inv.invoiceNumber}</strong></td>
        <td>${cust ? cust.name : '—'}</td>
        <td>${job ? job.serviceType : '—'}</td>
        <td>${job ? '<span style="max-width:180px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + job.description + '</span>' : '—'}</td>
        <td><strong>${S().formatCurrency(inv.total)}</strong></td>
        <td><span class="badge ${bc}"><span class="badge-dot"></span>${inv.status}</span></td>
        <td>${S().formatDate(inv.createdAt)}</td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Invoice #</th><th>Customer</th><th>Service</th><th>Description</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderDetail(id) {
    const inv = S().getInvoice(id);
    if (!inv) { renderList(); return; }
    const cust = S().getCustomer(inv.customerId);
    const job = S().getJob(inv.jobId);
    const tech = job ? S().getTechnician(job.technicianId) : null;
    const bc = inv.status === 'Paid' ? 'badge-paid' : 'badge-unpaid';
    const main = document.getElementById('main-content');

    main.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('invoices')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back
          </button>
          <h1>${inv.invoiceNumber}</h1>
          <span class="badge ${bc}" style="margin-left:12px;font-size:14px;padding:6px 16px"><span class="badge-dot"></span>${inv.status}</span>
        </div>
        <div class="btn-group mb-20">
          <button class="btn btn-primary" onclick="APP.Invoices.downloadPDF('${inv.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF
          </button>
          <button class="btn btn-outline" onclick="window.print()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print
          </button>
          ${inv.status === 'Unpaid' && APP.Auth.isAdmin() ? `<button class="btn btn-success" onclick="APP.Invoices.markPaid('${inv.id}')">Mark as Paid</button>` : ''}
          ${job ? `<button class="btn btn-outline" onclick="APP.Router.navigate('jobs','detail','${job.id}')">View Job</button>` : ''}
          ${cust ? `<a class="btn btn-outline" href="https://wa.me/${cust.phone.replace(/^0/,'94')}?text=${encodeURIComponent('Hi ' + cust.name + ', your invoice ' + inv.invoiceNumber + ' for ' + S().formatCurrency(inv.total) + ' is ready. Thank you! — CD Engineering')}" target="_blank">Send via WhatsApp</a>` : ''}
        </div>
        <div class="invoice-print" id="invoicePrint">
          <div class="invoice-header">
            <div class="invoice-logo-section">
              <h2>CD Engineering</h2>
              <p>Enterprises (PVT) Ltd</p>
              <p style="margin-top:8px;color:var(--gray-500);font-size:11px">Air Conditioning Solutions</p>
            </div>
            <div class="invoice-meta">
              <h1>INVOICE</h1>
              <p><strong>${inv.invoiceNumber}</strong></p>
              <p>Date: ${S().formatDate(inv.createdAt)}</p>
              <p>Status: ${inv.status}</p>
            </div>
          </div>
          <div class="invoice-parties">
            <div>
              <h4>Bill To</h4>
              <p><strong>${cust ? cust.name : '—'}</strong></p>
              <p>${cust ? cust.address : ''}</p>
              <p>${cust ? cust.phone : ''}</p>
            </div>
            <div style="text-align:right">
              <h4>From</h4>
              <p><strong>CD Engineering Enterprises (PVT) Ltd</strong></p>
              <p>Air Conditioning Services</p>
            </div>
          </div>
          ${job ? `<div style="margin-bottom:24px;padding:16px;background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-200)">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;font-size:13px">
              <div><strong>Service:</strong> ${job.serviceType}</div>
              <div><strong>Date:</strong> ${S().formatDate(job.date)}</div>
              <div><strong>Technician:</strong> ${tech ? tech.name : '—'}</div>
            </div>
            <p style="font-size:13px;color:var(--gray-600);margin-top:8px">${job.description}</p>
          </div>` : ''}
          <table class="data-table invoice-table">
            <thead><tr><th>Description</th><th style="text-align:right">Amount (Rs.)</th></tr></thead>
            <tbody>
              <tr><td>Parts / Materials</td><td style="text-align:right">${S().formatCurrency(inv.partsCost)}</td></tr>
              <tr><td>Labor Charges</td><td style="text-align:right">${S().formatCurrency(inv.laborCost)}</td></tr>
              <tr><td>Transport / Logistics</td><td style="text-align:right">${S().formatCurrency(inv.transportCost)}</td></tr>
            </tbody>
          </table>
          <div class="invoice-totals">
            <table class="invoice-totals-table">
              <tr><td>Subtotal (Total Cost)</td><td>${S().formatCurrency(inv.subtotal)}</td></tr>
              <tr><td>Overhead (${inv.overheadPercent}%)</td><td>${S().formatCurrency(inv.overheadAmount)}</td></tr>
              <tr><td>Profit Margin (${inv.profitPercent}%)</td><td>${S().formatCurrency(inv.profitAmount)}</td></tr>
              <tr class="grand-total"><td>Total Due</td><td>${S().formatCurrency(inv.total)}</td></tr>
            </table>
          </div>
          <div class="invoice-footer">
            <p><strong>Thank you for choosing CD Engineering Enterprises (PVT) Ltd</strong></p>
            <p style="margin-top:4px">Payment is due within 14 days of invoice date.</p>
          </div>
        </div>
      </div>`;
  }

  function generateFromJob(jobId) {
    const j = S().getJob(jobId);
    if (!j) { APP.toast('Job not found', 'error'); return; }
    const existing = S().getInvoiceByJob(jobId);
    if (existing) { APP.toast('Invoice already exists for this job', 'info'); APP.Router.navigate('invoices', 'detail', existing.id); return; }

    // Use the canonical buildInvoiceFromJob to ensure formula consistency
    const invData = S().buildInvoiceFromJob(j);
    const inv = S().addInvoice({
      jobId: j.id,
      customerId: j.customerId,
      ...invData,
      status: 'Unpaid',
    });
    APP.toast('Invoice ' + inv.invoiceNumber + ' generated');
    APP.Router.navigate('invoices', 'detail', inv.id);
  }

  function markPaid(id) {
    S().updateInvoice(id, { status: 'Paid' });
    APP.toast('Invoice marked as paid');
    renderDetail(id);
  }

  function downloadPDF(id) {
    const el = document.getElementById('invoicePrint');
    if (!el) return;
    const inv = S().getInvoice(id);
    const opt = {
      margin: [10, 10],
      filename: (inv ? inv.invoiceNumber : 'invoice') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save();
    APP.toast('PDF download started');
  }

  function filter(status) { currentFilter = status; renderList(); }

  return { render, generateFromJob, markPaid, downloadPDF, filter };
})();
