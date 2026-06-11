/* =========================================================
   CD Engineering — Invoices Module (Advanced Features)
   ========================================================= */
window.APP = window.APP || {};

APP.Invoices = (function () {
  const S = () => APP.Store;
  let currentFilter = 'All';
  let invoiceItemsCache = {}; // Cache items by invoiceId

  async function render(action, id) {
    if (action === 'detail' && id) return renderDetail(id);
    if (action === 'outstanding') return renderOutstandingLedger();
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
            <div><h1>Invoices</h1><p>View, edit, and manage client billing</p></div>
            <div style="display:flex;gap:12px;align-items:center">
              <button class="btn btn-outline" onclick="APP.Router.navigate('invoices', 'outstanding')">
                Outstanding Balance Ledger
              </button>
            </div>
          </div>
        </div>

        <div class="kpi-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 20px">
          <div class="kpi-card">
            <div class="kpi-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Total Collected</h4>
              <div class="kpi-value">${S().formatCurrency(stats.paidRevenue || 0)}</div>
              <div class="kpi-sub">${paidCount} invoices settled</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Outstanding Unpaid</h4>
              <div class="kpi-value" style="color:var(--warning)">${S().formatCurrency(stats.unpaidRevenue || 0)}</div>
              <div class="kpi-sub">${unpaidCount} invoices pending</div>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 2.5fr 1.5fr; gap:20px">
          <div class="card">
            <div class="card-header">
              <h3>Billing History</h3>
              <div class="filter-tabs" style="margin:0">
                <button class="filter-tab ${currentFilter==='All'?'active':''}" onclick="APP.Invoices.filter('All')">All (${allInvoices.length})</button>
                <button class="filter-tab ${currentFilter==='Unpaid'?'active':''}" onclick="APP.Invoices.filter('Unpaid')">Unpaid (${unpaidCount})</button>
                <button class="filter-tab ${currentFilter==='Paid'?'active':''}" onclick="APP.Invoices.filter('Paid')">Paid (${paidCount})</button>
              </div>
            </div>
            <div class="card-body compact">
              ${invoices.length ? buildTable(invoices) : '<div class="empty-state"><h3>No invoices found</h3><p>Generate invoices from a job detail page.</p></div>'}
            </div>
          </div>

          <!-- Bank Email Processing Panel -->
          <div class="card">
            <div class="card-header">
              <h3>Bank Slip / Email Auto-Matcher</h3>
            </div>
            <div class="card-body">
              <p style="font-size:12px;color:var(--gray-500);margin-bottom:12px">
                Paste bank deposit notifications (e.g. Commercial Bank, Sampath Bank advice emails) below to auto-verify invoice payments.
              </p>
              <textarea class="form-control" id="bankEmailInput" rows="5" style="font-family:monospace;font-size:11px" placeholder="Paste bank email here..."></textarea>
              <button class="btn btn-primary" onclick="APP.Invoices.processEmailText()" style="width:100%;margin-top:10px;justify-content:center">
                Scan Email Notification
              </button>
              <div id="emailProcessResult" class="mt-20" style="display:none"></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function buildTable(invoices) {
    const rows = invoices.map(inv => {
      const cust = S().getCustomer(inv.customerId);
      const job = S().getJob(inv.jobId);
      const branch = S().getBranches().find(b => b.id === inv.branchId);
      const bc = inv.status === 'Paid' ? 'badge-paid' : 'badge-unpaid';
      return `<tr class="clickable" onclick="APP.Router.navigate('invoices','detail','${inv.id}')">
        <td><strong>${inv.invoiceNumber}</strong></td>
        <td>
          ${cust ? cust.name : '—'}
          ${branch ? `<div class="text-muted" style="font-size:10px">${branch.name}</div>` : ''}
        </td>
        <td>${job ? job.serviceType : 'Custom'}</td>
        <td><strong>${S().formatCurrency(inv.total)}</strong></td>
        <td><span class="badge ${bc}"><span class="badge-dot"></span>${inv.status}</span></td>
        <td>${S().formatDate(inv.createdAt)}</td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Invoice #</th><th>Customer / Branch</th><th>Service</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  async function renderDetail(id) {
    const inv = S().getInvoice(id);
    if (!inv) { renderList(); return; }
    const cust = S().getCustomer(inv.customerId);
    const job = inv.jobId ? S().getJob(inv.jobId) : null;
    const tech = job ? S().getTechnician(job.technicianId) : null;

    // Load and cache invoice items
    const items = await S().getInvoiceItems(id);
    invoiceItemsCache[id] = items;

    const branch = S().getBranches().find(b => b.id === inv.branchId);
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
          ${inv.status === 'Unpaid' ? `
            <button class="btn btn-primary" onclick="APP.Invoices.openEditModal('${inv.id}')">
              Edit Invoice (Add Works / Price)
            </button>
          ` : ''}
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
              ${branch ? `<p><strong>Branch/SBU:</strong> ${branch.name} (${branch.type})</p>` : ''}
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
            <thead><tr><th style="width:50px">#</th><th>Description</th><th style="text-align:center;width:60px">Qty</th><th style="text-align:right;width:110px">Unit Price</th><th style="text-align:right;width:110px">Amount</th></tr></thead>
            <tbody>
              ${items.length ? items.map((item, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${item.description}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${S().formatCurrency(item.unitPrice)}</td><td style="text-align:right">${S().formatCurrency(item.amount)}</td></tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:16px">No invoice items found.</td></tr>`}
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

          <!-- Signatures -->
          <div class="js-signatures" style="margin-top:40px;margin-bottom:20px">
            <div class="js-signature-block">
              <div class="js-signature-line"></div>
              <p>Prepared By</p>
              <span>CD Engineering</span>
            </div>
            <div class="js-signature-block">
              <div class="js-signature-line"></div>
              <p>Authorized By</p>
              <span>CD Engineering</span>
            </div>
            <div class="js-signature-block">
              <div class="js-signature-line"></div>
              <p>Customer Acknowledgement</p>
              <span>Name: ${cust ? cust.name : '_______________'}</span>
            </div>
          </div>

          <div class="invoice-footer">
            <p><strong>Thank you for choosing CD Engineering Enterprises (PVT) Ltd</strong></p>
            <p style="margin-top:4px">Payment is due within 14 days of invoice date. All hardware carries a minimum 1-year warranty.</p>
          </div>
        </div>
      </div>`;
  }

  async function processEmailText() {
    const txt = document.getElementById('bankEmailInput').value.trim();
    const resultBox = document.getElementById('emailProcessResult');
    if (!txt) { APP.toast('Please paste email content first', 'error'); return; }

    const res = await S().processBankEmail(txt);
    resultBox.style.display = 'block';
    if (!res || !res.success) {
      resultBox.innerHTML = `
        <div style="background:var(--danger-bg);color:var(--danger-text);padding:12px;border-radius:6px;font-size:13px">
          <strong>Verification Failed:</strong> ${res ? res.message : 'Could not analyze deposit notification.'}
          ${res && res.parsedAmount ? `<div class="mt-8">Detected amount LKR: <strong>${res.parsedAmount.toLocaleString()}</strong></div>` : ''}
        </div>
      `;
      return;
    }

    if (res.type === 'perfect') {
      resultBox.innerHTML = `
        <div style="background:var(--success-bg);color:var(--success-text);padding:14px;border-radius:6px;font-size:13px">
          <strong style="font-size:14px">Perfect Match Found!</strong>
          <div class="mt-8">
            <strong>Invoice:</strong> ${res.invoice.invoiceNumber}<br>
            <strong>Customer Balance:</strong> ${S().formatCurrency(res.invoice.total)}<br>
            <strong>Matched Deposited:</strong> Rs. ${res.parsedAmount.toLocaleString()}<br>
          </div>
          ${APP.Auth.isAdmin() ? `
            <button class="btn btn-success btn-sm mt-10" onclick="APP.Invoices.applyBankApproval('${res.invoice.id}')" style="width:100%">
              Approve Deposit & Mark Invoice Paid
            </button>
          ` : '<p class="mt-8"><em>Admin privilege required to mark invoice as paid.</em></p>'}
        </div>
      `;
    } else if (res.type === 'partial') {
      resultBox.innerHTML = `
        <div style="background:var(--warning-bg);color:var(--warning-text);padding:14px;border-radius:6px;font-size:13px">
          <strong>Reference Match / Amount Mismatch:</strong>
          <div class="mt-8">
            <strong>Invoice:</strong> ${res.invoice.invoiceNumber}<br>
            <strong>Invoice Total:</strong> ${S().formatCurrency(res.invoice.total)}<br>
            <strong>Pasted Notification Amount:</strong> Rs. ${res.parsedAmount ? res.parsedAmount.toLocaleString() : 'Undetected'}<br>
          </div>
          <p class="mt-8">The reference matches the invoice but the amounts do not align. Verify manually.</p>
          ${APP.Auth.isAdmin() ? `
            <button class="btn btn-outline btn-sm mt-10" onclick="APP.Invoices.applyBankApproval('${res.invoice.id}')" style="width:100%">
              Force Approve & Mark Paid Anyway
            </button>
          ` : ''}
        </div>
      `;
    } else if (res.type === 'amount_only') {
      const links = res.invoices.map(inv => `
        <div style="display:flex;justify-content:between;margin-top:6px;border-bottom:1px solid rgba(0,0,0,0.05);padding-bottom:4px">
          <span>${inv.invoiceNumber} (${S().formatCurrency(inv.total)})</span>
          ${APP.Auth.isAdmin() ? `<button class="btn btn-success btn-xs" onclick="APP.Invoices.applyBankApproval('${inv.id}')" style="margin-left:auto">Select</button>` : ''}
        </div>
      `).join('');
      resultBox.innerHTML = `
        <div style="background:var(--warning-bg);color:var(--warning-text);padding:14px;border-radius:6px;font-size:13px">
          <strong>Matched by Amount Only (LKR ${res.parsedAmount.toLocaleString()}):</strong>
          <p class="mt-8">No invoice number in reference. Select matching unpaid invoice to mark paid:</p>
          <div class="mt-10">${links}</div>
        </div>
      `;
    }
  }

  async function applyBankApproval(id) {
    await S().updateInvoice(id, { status: 'Paid' });
    APP.toast('Payment verified and invoice marked Paid!');
    document.getElementById('emailProcessResult').style.display = 'none';
    document.getElementById('bankEmailInput').value = '';
    await S().loadAll();
    renderList();
  }

  function openEditModal(id) {
    const inv = S().getInvoice(id);
    if (!inv) return;
    const items = invoiceItemsCache[id] || [];
    const branches = S().getBranches();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'editInvoiceModal';

    let rowsHtml = items.map((item, idx) => `
      <tr class="item-row" data-idx="${idx}">
        <td><input type="text" class="form-control item-desc" value="${item.description}" style="font-size:13px" required></td>
        <td><input type="number" class="form-control item-qty" value="${item.quantity}" style="width:70px;text-align:center" oninput="APP.Invoices.recalcModalTotals()" min="0.1" step="any" required></td>
        <td><input type="number" class="form-control item-price" value="${item.unitPrice}" style="width:110px;text-align:right" oninput="APP.Invoices.recalcModalTotals()" min="0" required></td>
        <td class="item-amount" style="text-align:right;font-weight:700;padding-top:14px">${S().formatCurrency(item.amount)}</td>
        <td style="text-align:center"><button class="btn btn-danger btn-xs" onclick="this.closest('tr').remove();APP.Invoices.recalcModalTotals()" style="padding:2px 6px">×</button></td>
      </tr>
    `).join('');

    overlay.innerHTML = `
      <div class="modal" style="max-width:760px">
        <div class="modal-header">
          <h3>Edit Invoice — ${inv.invoiceNumber}</h3>
          <button class="modal-close" onclick="document.getElementById('editInvoiceModal').remove()">&times;</button>
        </div>
        <div class="modal-body" style="max-height:480px;overflow-y:auto">
          <div class="form-row">
            <div class="form-group">
              <label>Branch / SBU</label>
              <select id="inv-branch" class="form-control">
                <option value="">-- None / Standalone --</option>
                ${branches.map(b => `<option value="${b.id}" ${inv.branchId === b.id ? 'selected' : ''}>${b.name} (${b.type})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input class="form-control" type="text" value="${S().formatDate(inv.createdAt)}" disabled style="background:var(--gray-50)">
            </div>
          </div>

          <div style="display:flex;justify-content:between;align-items:center;margin-top:16px;margin-bottom:8px">
            <span style="font-weight:700;color:var(--gray-700)">Invoice Line Items (Works & Materials)</span>
            <button class="btn btn-outline btn-xs" onclick="APP.Invoices.addModalRow()" style="margin-left:auto">
              + Add Item / Work
            </button>
          </div>

          <table class="data-table compact" style="margin-bottom:16px">
            <thead>
              <tr>
                <th>Description</th>
                <th style="width:80px;text-align:center">Qty</th>
                <th style="width:120px;text-align:right">Unit Price (Rs.)</th>
                <th style="width:120px;text-align:right">Amount</th>
                <th style="width:50px;text-align:center">Del</th>
              </tr>
            </thead>
            <tbody id="modal-invoice-items-body">
              ${rowsHtml}
            </tbody>
          </table>

          <div class="form-row">
            <div class="form-group">
              <label>Overhead (%)</label>
              <input type="number" id="inv-overhead-pct" class="form-control" value="${inv.overheadPercent}" oninput="APP.Invoices.recalcModalTotals()">
            </div>
            <div class="form-group">
              <label>Profit Margin (%)</label>
              <input type="number" id="inv-profit-pct" class="form-control" value="${inv.profitPercent}" oninput="APP.Invoices.recalcModalTotals()">
            </div>
          </div>

          <div style="background:var(--gray-50);padding:16px;border-radius:8px;margin-top:16px">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:right">
              <div><span class="text-muted">Subtotal:</span> <strong id="lbl-subtotal">${S().formatCurrency(inv.subtotal)}</strong></div>
              <div><span class="text-muted">Overhead:</span> <strong id="lbl-overhead">${S().formatCurrency(inv.overheadAmount)}</strong></div>
              <div><span class="text-muted">Profit Margin:</span> <strong id="lbl-profit">${S().formatCurrency(inv.profitAmount)}</strong></div>
            </div>
            <hr style="border:none;border-top:1px solid var(--gray-200);margin:10px 0">
            <div style="text-align:right;font-size:18px">
              <strong>Grand Total Due:</strong> <strong id="lbl-total" class="text-success">${S().formatCurrency(inv.total)}</strong>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('editInvoiceModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Invoices.saveInvoiceChanges('${inv.id}')">Save Changes</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function addModalRow() {
    const tbody = document.getElementById('modal-invoice-items-body');
    const tr = document.createElement('tr');
    tr.className = 'item-row';
    tr.innerHTML = `
      <td><input type="text" class="form-control item-desc" style="font-size:13px" required placeholder="e.g. Extra AC piping work"></td>
      <td><input type="number" class="form-control item-qty" value="1" style="width:70px;text-align:center" oninput="APP.Invoices.recalcModalTotals()" min="0.1" step="any" required></td>
      <td><input type="number" class="form-control item-price" value="0" style="width:110px;text-align:right" oninput="APP.Invoices.recalcModalTotals()" min="0" required></td>
      <td class="item-amount" style="text-align:right;font-weight:700;padding-top:14px">Rs. 0.00</td>
      <td style="text-align:center"><button class="btn btn-danger btn-xs" onclick="this.closest('tr').remove();APP.Invoices.recalcModalTotals()" style="padding:2px 6px">×</button></td>
    `;
    tbody.appendChild(tr);
    recalcModalTotals();
  }

  function recalcModalTotals() {
    let subtotal = 0;
    document.querySelectorAll('.item-row').forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const price = parseFloat(row.querySelector('.item-price').value) || 0;
      const amount = qty * price;
      subtotal += amount;
      row.querySelector('.item-amount').textContent = 'Rs. ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    const overheadPct = parseFloat(document.getElementById('inv-overhead-pct').value) || 0;
    const profitPct = parseFloat(document.getElementById('inv-profit-pct').value) || 0;

    const afterOverhead = subtotal * (1 + overheadPct / 100);
    const overheadAmount = afterOverhead - subtotal;
    const total = afterOverhead * (1 + profitPct / 100);
    const profitAmount = total - afterOverhead;

    document.getElementById('lbl-subtotal').textContent = 'Rs. ' + subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('lbl-overhead').textContent = 'Rs. ' + overheadAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('lbl-profit').textContent = 'Rs. ' + profitAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('lbl-total').textContent = 'Rs. ' + total.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function saveInvoiceChanges(invoiceId) {
    const branchId = document.getElementById('inv-branch').value;
    const overheadPercent = parseFloat(document.getElementById('inv-overhead-pct').value) || 0;
    const profitPercent = parseFloat(document.getElementById('inv-profit-pct').value) || 0;

    const items = [];
    let subtotal = 0;
    let partsCost = 0;
    let laborCost = 0;
    let transportCost = 0;

    let valid = true;
    document.querySelectorAll('.item-row').forEach(row => {
      const description = row.querySelector('.item-desc').value.trim();
      const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
      const unitPrice = parseFloat(row.querySelector('.item-price').value) || 0;
      if (!description || quantity <= 0) valid = false;

      const amount = quantity * unitPrice;
      subtotal += amount;

      if (description.toLowerCase().includes('labor')) {
        laborCost += amount;
      } else if (description.toLowerCase().includes('transport') || description.toLowerCase().includes('logistic')) {
        transportCost += amount;
      } else {
        partsCost += amount;
      }

      items.push({ description, quantity, unitPrice, amount });
    });

    if (!valid || items.length === 0) {
      APP.toast('Please add valid description and quantities to all items', 'error');
      return;
    }

    const payload = {
      branchId,
      overheadPercent,
      profitPercent,
      partsCost,
      laborCost,
      transportCost,
      items
    };

    const res = await S().updateInvoice(invoiceId, payload);
    if (res) {
      APP.toast('Invoice updated successfully');
      document.getElementById('editInvoiceModal').remove();
      await S().loadAll();
      renderDetail(invoiceId);
    }
  }

  function renderOutstandingLedger() {
    const main = document.getElementById('main-content');
    const invoices = S().getInvoices().filter(i => i.status === 'Unpaid');

    // Group unpaid invoices by customer
    const customersMap = {};
    invoices.forEach(inv => {
      const c = S().getCustomer(inv.customerId);
      const custName = c ? c.name : 'Unknown Client';
      if (!customersMap[inv.customerId]) {
        customersMap[inv.customerId] = {
          customerId: inv.customerId,
          name: custName,
          phone: c ? c.phone : '',
          totalOutstanding: 0,
          invoices: []
        };
      }

      // Calculate aging
      const createdDate = new Date(inv.createdAt);
      const diffTime = Math.abs(new Date() - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let ageGroup = '0-30 days';
      if (diffDays > 60) ageGroup = '60+ days';
      else if (diffDays > 30) ageGroup = '30-60 days';

      customersMap[inv.customerId].totalOutstanding += inv.total;
      customersMap[inv.customerId].invoices.push({
        ...inv,
        daysOld: diffDays,
        ageGroup
      });
    });

    const outstandingList = Object.values(customersMap).sort((a,b) => b.totalOutstanding - a.totalOutstanding);
    const totalDue = invoices.reduce((s,i) => s + i.total, 0);

    main.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('invoices')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back
          </button>
          <h1>Outstanding Payments Balance Ledger</h1>
        </div>

        <div class="card mb-20" style="background:var(--warning-bg);border-color:var(--warning)">
          <div class="card-body">
            <div style="font-size:14px;color:var(--warning-text);font-weight:700">Total Unpaid Balance Due</div>
            <div style="font-size:32px;font-weight:900;color:var(--warning-text);margin-top:6px">
              ${S().formatCurrency(totalDue)}
            </div>
            <p style="font-size:12px;color:var(--warning-text);margin-top:6px;opacity:0.8">Across ${invoices.length} outstanding invoices</p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Outstanding Balances by Client</h3>
          </div>
          <div class="card-body compact">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Invoices Pending</th>
                    <th>0-30 Days</th>
                    <th>30-60 Days</th>
                    <th>60+ Days</th>
                    <th>Total Outstanding</th>
                    <th style="width:180px;text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${outstandingList.length ? outstandingList.map(c => {
                    const group0_30 = c.invoices.filter(i=>i.ageGroup==='0-30 days').reduce((sum,i)=>sum+i.total, 0);
                    const group30_60 = c.invoices.filter(i=>i.ageGroup==='30-60 days').reduce((sum,i)=>sum+i.total, 0);
                    const group60Plus = c.invoices.filter(i=>i.ageGroup==='60+ days').reduce((sum,i)=>sum+i.total, 0);

                    return `
                      <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.invoices.length}</td>
                        <td>${group0_30 > 0 ? S().formatCurrency(group0_30) : '—'}</td>
                        <td>${group30_60 > 0 ? S().formatCurrency(group30_60) : '—'}</td>
                        <td style="color:var(--danger);font-weight:700">${group60Plus > 0 ? S().formatCurrency(group60Plus) : '—'}</td>
                        <td><strong class="text-primary">${S().formatCurrency(c.totalOutstanding)}</strong></td>
                        <td style="text-align:right">
                          <div class="btn-group" style="justify-content:flex-end">
                            <button class="btn btn-outline btn-xs" onclick="APP.Router.navigate('customers', 'detail', '${c.customerId}')">View Account</button>
                            ${c.phone ? `
                              <a class="btn btn-success btn-xs" href="https://wa.me/${c.phone.replace(/^0/,'94')}?text=${encodeURIComponent('Hi ' + c.name + ', this is a friendly payment reminder from CD Engineering. Your outstanding balance is ' + S().formatCurrency(c.totalOutstanding) + '. Please let us know when payment is processed. Thank you!')}" target="_blank">
                                Remind WA
                              </a>
                            ` : ''}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--gray-400)">Awesome! All balances are settled. No outstanding invoices!</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
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

  return {
    render,
    filter,
    markPaid,
    downloadPDF,
    openEditModal,
    addModalRow,
    recalcModalTotals,
    saveInvoiceChanges,
    processEmailText,
    applyBankApproval
  };
})();
