/* =========================================================
   CD Engineering — Expenses (PNL) Module
   ========================================================= */
window.APP = window.APP || {};

APP.Bills = (function () {
  const S = () => APP.Store;
  let currentFilter = 'All';

  function render() {
    renderList();
  }

  function renderList() {
    const main = document.getElementById('main-content');
    const allBills = S().getBills();
    const stats = S().getStats();

    // Calculate PNL breakdown
    const totalCollected = stats.paidRevenue || 0;
    const totalUnpaidRev = stats.unpaidRevenue || 0;

    const bills = currentFilter === 'All' ? allBills : allBills.filter(b => b.status === currentFilter);
    const totalPaidBills = allBills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalUnpaidBills = allBills.filter(b => b.status === 'Unpaid').reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalBillsVal = totalPaidBills + totalUnpaidBills;

    const netCashFlowProfit = totalCollected - totalPaidBills;
    const netAccrualProfit = (totalCollected + totalUnpaidRev) - totalBillsVal;

    const pnlStatusClass = netCashFlowProfit >= 0 ? 'text-success' : 'text-danger';

    // Group bills by category for chart/summary
    const expensesByCategory = {};
    allBills.forEach(b => {
      expensesByCategory[b.category] = (expensesByCategory[b.category] || 0) + (b.amount || 0);
    });

    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div>
              <h1>Profit & Loss (PNL) & Expenses</h1>
              <p>Enter operating expenses and view actual company profitability</p>
            </div>
            <button class="btn btn-primary" onclick="APP.Bills.openModal()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Expense / Bill
            </button>
          </div>
        </div>

        <!-- Financial Statement (PNL Dashboard) -->
        <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px">
          <div class="kpi-card">
            <div class="kpi-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Collected Revenue</h4>
              <div class="kpi-value">${S().formatCurrency(totalCollected)}</div>
              <div class="kpi-sub">${S().formatCurrency(totalUnpaidRev)} unpaid outstanding</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon red" style="background:rgba(239, 68, 68, 0.1);color:var(--danger)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Total Expenses</h4>
              <div class="kpi-value" style="color:var(--danger)">${S().formatCurrency(totalBillsVal)}</div>
              <div class="kpi-sub">${S().formatCurrency(totalPaidBills)} paid &nbsp;|&nbsp; ${S().formatCurrency(totalUnpaidBills)} unpaid</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Cash Net Profit</h4>
              <div class="kpi-value ${pnlStatusClass}">${S().formatCurrency(netCashFlowProfit)}</div>
              <div class="kpi-sub">Actual money collected minus bills paid</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="kpi-info">
              <h4>Accrual Net Profit</h4>
              <div class="kpi-value" style="color:${netAccrualProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${S().formatCurrency(netAccrualProfit)}</div>
              <div class="kpi-sub">Total Revenue minus Total Bills (accrual)</div>
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px">
          <!-- Bills Table -->
          <div class="card">
            <div class="card-header">
              <h3>Expenses Ledger</h3>
              <div class="filter-tabs" style="margin:0">
                <button class="filter-tab ${currentFilter==='All'?'active':''}" onclick="APP.Bills.filter('All')">All</button>
                <button class="filter-tab ${currentFilter==='Paid'?'active':''}" onclick="APP.Bills.filter('Paid')">Paid</button>
                <button class="filter-tab ${currentFilter==='Unpaid'?'active':''}" onclick="APP.Bills.filter('Unpaid')">Unpaid</button>
              </div>
            </div>
            <div class="card-body compact">
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bill #</th>
                      <th>Category</th>
                      <th>Vendor</th>
                      <th>Description</th>
                      <th style="text-align:right">Amount</th>
                      <th>Status</th>
                      <th style="width:100px;text-align:right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${bills.length ? bills.map(b => `
                      <tr class="clickable" onclick="APP.Bills.openModal('${b.id}')">
                        <td>${S().formatDate(b.date)}</td>
                        <td><strong>${b.bill_number}</strong></td>
                        <td><span class="badge" style="background:var(--gray-100);color:var(--gray-700)">${b.category}</span></td>
                        <td>${b.vendor || '—'}</td>
                        <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.description || '—'}</td>
                        <td style="text-align:right;font-weight:700">${S().formatCurrency(b.amount)}</td>
                        <td><span class="badge ${b.status==='Paid'?'badge-paid':'badge-unpaid'}"><span class="badge-dot"></span>${b.status}</span></td>
                        <td style="text-align:right" onclick="event.stopPropagation()">
                          <div class="btn-group" style="justify-content:flex-end">
                            <button class="btn-icon" onclick="APP.Bills.openModal('${b.id}')" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            <button class="btn-icon" onclick="APP.Bills.confirmDelete('${b.id}')" title="Delete" style="color:var(--danger)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                          </div>
                        </td>
                      </tr>
                    `).join('') : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray-400)">No bills found in this category.</td></tr>`}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Expenses by Category breakdown -->
          <div class="card">
            <div class="card-header">
              <h3>Expense Breakdown</h3>
            </div>
            <div class="card-body">
              ${Object.keys(expensesByCategory).length ? `
                <div style="display:flex;flex-direction:column;gap:14px">
                  ${Object.entries(expensesByCategory).sort((a,b)=>b[1]-a[1]).map(([cat, val]) => {
                    const pct = totalBillsVal > 0 ? (val / totalBillsVal * 100).toFixed(0) : 0;
                    return `
                      <div>
                        <div style="display:flex;justify-content:between;margin-bottom:4px;font-size:13px">
                          <strong>${cat}</strong>
                          <span style="margin-left:auto">${S().formatCurrency(val)} (${pct}%)</span>
                        </div>
                        <div style="background:var(--gray-100);height:8px;border-radius:4px;overflow:hidden">
                          <div style="background:var(--primary-500);height:100%;width:${pct}%"></div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : '<p class="text-muted" style="text-align:center;padding:20px 0">No expenses recorded yet</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function filter(status) {
    currentFilter = status;
    renderList();
  }

  function openModal(id) {
    const b = id ? S().getBills().find(x => x.id === id) : null;
    const categories = ['Fuel', 'Rent', 'Salaries', 'Materials', 'Utilities', 'Taxes', 'Marketing', 'Other'];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'billModal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <h3>${b ? 'Edit' : 'Add'} Expense Bill</h3>
          <button class="modal-close" onclick="document.getElementById('billModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Bill/Reference Number</label>
            <input type="text" id="bill-num" value="${b ? b.bill_number : 'BILL-' + Date.now()}" class="form-control">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select id="bill-category" class="form-control">
                ${categories.map(c => `<option value="${c}" ${b && b.category === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Amount (Rs.) *</label>
              <input type="number" id="bill-amount" value="${b ? b.amount : ''}" class="form-control" required min="0">
            </div>
          </div>
          <div class="form-group">
            <label>Vendor</label>
            <input type="text" id="bill-vendor" value="${b ? b.vendor : ''}" class="form-control" placeholder="Supplier / Vendor name">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="bill-date" value="${b ? b.date : new Date().toISOString().split('T')[0]}" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Payment Status *</label>
              <select id="bill-status" class="form-control">
                <option value="Paid" ${b && b.status === 'Paid' ? 'selected' : ''}>Paid</option>
                <option value="Unpaid" ${b && b.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="bill-desc" class="form-control" rows="2" placeholder="Detail description...">${b && b.description ? b.description : ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('billModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="APP.Bills.save('${id || ''}')">Save Bill</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  async function save(id) {
    const billNumber = document.getElementById('bill-num').value.trim();
    const category = document.getElementById('bill-category').value;
    const amount = parseFloat(document.getElementById('bill-amount').value) || 0;
    const vendor = document.getElementById('bill-vendor').value.trim();
    const date = document.getElementById('bill-date').value;
    const status = document.getElementById('bill-status').value;
    const description = document.getElementById('bill-desc').value.trim();

    if (!date || amount <= 0) {
      APP.toast('Please enter a valid date and amount', 'error');
      return;
    }

    const payload = { billNumber, category, amount, vendor, date, status, description };

    if (id) {
      const res = await S().updateBill(id, payload);
      if (res) APP.toast('Bill updated');
    } else {
      const res = await S().addBill(payload);
      if (res) APP.toast('Bill added');
    }
    document.getElementById('billModal').remove();
    await S().loadAll();
    renderList();
  }

  function confirmDelete(id) {
    const b = S().getBills().find(x => x.id === id);
    if (!b) return;
    APP.confirm({
      title: 'Delete Bill?',
      message: `Remove this bill of Rs. ${b.amount}? This will recalculate PNL.`,
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        await S().deleteBill(id);
        APP.toast('Bill deleted');
        await S().loadAll();
        renderList();
      }
    });
  }

  return { render, filter, openModal, save, confirmDelete };
})();
