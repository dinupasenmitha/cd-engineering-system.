/* =========================================================
   CD Engineering — Pricing & Quotation Module (Production-Ready)
   ========================================================= */
window.APP = window.APP || {};

APP.Pricing = (function () {
  const S = () => APP.Store;

  function render() {
    const quotations = S().getQuotations().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const customers = S().getCustomers().sort((a, b) => a.name.localeCompare(b.name));
    const jobs = S().getJobs().sort((a, b) => new Date(b.date) - new Date(a.date));
    const custOpts = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const jobOpts = jobs.map(j => {
      const cust = S().getCustomer(j.customerId);
      return `<option value="${j.id}">${cust ? cust.name : '—'} — ${j.serviceType} (${S().formatDate(j.date)})</option>`;
    }).join('');
    const services = S().getServices().sort((a, b) => a.name.localeCompare(b.name));
    const parts = S().getParts().sort((a, b) => a.name.localeCompare(b.name));
    const srvOpts = services.map(s => `<option value="${s.id}" data-price="${s.standardPrice}">${s.name} (Rs. ${s.standardPrice})</option>`).join('');
    const prtOpts = parts.map(p => `<option value="${p.id}" data-price="${p.unitPrice}">${p.name} (Rs. ${p.unitPrice})</option>`).join('');

    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>Pricing & Quotations</h1><p>Calculate costs and generate quotations</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div class="card">
            <div class="card-header"><h3>Price Calculator</h3></div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group"><label>Customer</label><select class="form-control" id="prcCustomer"><option value="">Select (optional)</option>${custOpts}</select></div>
                <div class="form-group"><label>Link to Job</label><select class="form-control" id="prcJob" onchange="APP.Pricing.loadJobCosts()"><option value="">Select (optional)</option>${jobOpts}</select></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Load from Service Catalog</label><select class="form-control" id="prcService" onchange="APP.Pricing.loadService()"><option value="">-- Select Service --</option>${srvOpts}</select></div>
                <div class="form-group"><label>Add Part</label>
                  <div style="display:flex; gap:8px">
                    <select class="form-control" id="prcPart"><option value="">-- Select Part --</option>${prtOpts}</select>
                    <button class="btn btn-secondary" onclick="APP.Pricing.addPart()">Add</button>
                  </div>
                </div>
              </div>
              <hr style="border:none;border-top:1px solid var(--gray-200);margin:4px 0 16px">
              <p style="font-size:12px;color:var(--gray-400);margin-bottom:12px">Formula: Final = (Parts + Labor + Transport) × (1 + Overhead%) × (1 + Profit%)</p>
              <div class="form-row-3">
                <div class="form-group"><label>Parts Cost (Rs.)</label><input class="form-control" type="number" id="prcParts" value="0" oninput="APP.Pricing.calc()"></div>
                <div class="form-group"><label>Labor Cost (Rs.)</label><input class="form-control" type="number" id="prcLabor" value="0" oninput="APP.Pricing.calc()"></div>
                <div class="form-group"><label>Transport Cost (Rs.)</label><input class="form-control" type="number" id="prcTransport" value="0" oninput="APP.Pricing.calc()"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>Overhead %</label><input class="form-control" type="number" id="prcOverhead" value="10" oninput="APP.Pricing.calc()"></div>
                <div class="form-group"><label>Profit Margin %</label><input class="form-control" type="number" id="prcProfit" value="30" oninput="APP.Pricing.calc()"></div>
              </div>
              <div class="btn-group" style="margin-top:8px">
                <button class="btn btn-primary" onclick="APP.Pricing.generateQuotation()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Generate Quotation
                </button>
                <button class="btn btn-outline" onclick="APP.Pricing.clearForm()">Clear</button>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Cost Breakdown</h3></div>
            <div class="card-body">
              <div class="pricing-breakdown" id="prcBreakdown">
                <div class="pricing-row"><span>Parts Cost</span><span id="bd-parts">Rs. 0.00</span></div>
                <div class="pricing-row"><span>Labor Cost</span><span id="bd-labor">Rs. 0.00</span></div>
                <div class="pricing-row"><span>Transport Cost</span><span id="bd-transport">Rs. 0.00</span></div>
                <div class="pricing-row subtotal"><span>Subtotal (Total Cost)</span><span id="bd-subtotal">Rs. 0.00</span></div>
                <div class="pricing-row"><span>× (1 + <span id="bd-oh-pct">10</span>%) Overhead</span><span id="bd-overhead">Rs. 0.00</span></div>
                <div class="pricing-row"><span>× (1 + <span id="bd-pr-pct">30</span>%) Profit Margin</span><span id="bd-profit">Rs. 0.00</span></div>
                <div class="pricing-row total"><span>Final Price</span><span id="bd-total">Rs. 0.00</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quotation History -->
        <div class="card mt-20">
          <div class="card-header"><h3>Quotation History (${quotations.length})</h3></div>
          <div class="card-body compact">
            ${quotations.length ? buildQuotationTable(quotations) : '<div class="empty-state"><h3>No quotations yet</h3><p>Generate your first quotation above.</p></div>'}
          </div>
        </div>
      </div>`;
  }

  function buildQuotationTable(quotations) {
    const rows = quotations.map(q => {
      const cust = S().getCustomer(q.customerId);
      const job = q.jobId ? S().getJob(q.jobId) : null;
      return `<tr>
        <td><strong>${q.quotationNumber}</strong></td>
        <td>${cust ? cust.name : '—'}</td>
        <td>${job ? job.serviceType : '—'}</td>
        <td>${S().formatCurrency(q.subtotal)}</td>
        <td><strong>${S().formatCurrency(q.total)}</strong></td>
        <td>${S().formatDate(q.createdAt)}</td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>Quotation #</th><th>Customer</th><th>Service</th><th>Subtotal</th><th>Final Price</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // Auto-fill costs from selected job
  function loadJobCosts() {
    const jobId = document.getElementById('prcJob').value;
    if (!jobId) return;
    const j = S().getJob(jobId);
    if (!j) return;
    document.getElementById('prcParts').value = j.partsCost || 0;
    document.getElementById('prcLabor').value = j.laborCost || 0;
    document.getElementById('prcTransport').value = j.transportCost || 0;
    document.getElementById('prcOverhead').value = j.overheadPercent || 10;
    document.getElementById('prcProfit').value = j.profitPercent || 30;
    // Also set customer
    if (j.customerId) document.getElementById('prcCustomer').value = j.customerId;
    calc();
  }

  function loadService() {
    const select = document.getElementById('prcService');
    const opt = select.options[select.selectedIndex];
    if (opt && opt.dataset.price) {
      document.getElementById('prcLabor').value = opt.dataset.price;
      calc();
    }
  }

  function addPart() {
    const select = document.getElementById('prcPart');
    const opt = select.options[select.selectedIndex];
    if (opt && opt.dataset.price) {
      const partsInput = document.getElementById('prcParts');
      partsInput.value = (parseFloat(partsInput.value) || 0) + parseFloat(opt.dataset.price);
      calc();
      select.value = ''; // Reset select
    }
  }

  function calc() {
    const parts = parseFloat(document.getElementById('prcParts').value) || 0;
    const labor = parseFloat(document.getElementById('prcLabor').value) || 0;
    const transport = parseFloat(document.getElementById('prcTransport').value) || 0;
    const overheadPct = parseFloat(document.getElementById('prcOverhead').value) || 0;
    const profitPct = parseFloat(document.getElementById('prcProfit').value) || 0;

    const r = S().calculatePricing(parts, labor, transport, overheadPct, profitPct);
    const f = S().formatCurrency;

    document.getElementById('bd-parts').textContent = f(parts);
    document.getElementById('bd-labor').textContent = f(labor);
    document.getElementById('bd-transport').textContent = f(transport);
    document.getElementById('bd-subtotal').textContent = f(r.subtotal);
    document.getElementById('bd-oh-pct').textContent = overheadPct;
    document.getElementById('bd-overhead').textContent = f(r.overheadAmount);
    document.getElementById('bd-pr-pct').textContent = profitPct;
    document.getElementById('bd-profit').textContent = f(r.profitAmount);
    document.getElementById('bd-total').textContent = f(r.total);
  }

  function clearForm() {
    document.getElementById('prcParts').value = 0;
    document.getElementById('prcLabor').value = 0;
    document.getElementById('prcTransport').value = 0;
    document.getElementById('prcOverhead').value = 10;
    document.getElementById('prcProfit').value = 30;
    document.getElementById('prcCustomer').value = '';
    document.getElementById('prcJob').value = '';
    calc();
  }

  function generateQuotation() {
    const customerId = document.getElementById('prcCustomer').value;
    const jobId = document.getElementById('prcJob').value;
    const partsCost = parseFloat(document.getElementById('prcParts').value) || 0;
    const laborCost = parseFloat(document.getElementById('prcLabor').value) || 0;
    const transportCost = parseFloat(document.getElementById('prcTransport').value) || 0;
    const overheadPercent = parseFloat(document.getElementById('prcOverhead').value) || 0;
    const profitPercent = parseFloat(document.getElementById('prcProfit').value) || 0;

    if (partsCost + laborCost + transportCost === 0) { APP.toast('Please enter cost values', 'error'); return; }
    if (partsCost < 0 || laborCost < 0 || transportCost < 0 || overheadPercent < 0 || profitPercent < 0) { APP.toast('Costs and percentages cannot be negative', 'error'); return; }

    const r = S().calculatePricing(partsCost, laborCost, transportCost, overheadPercent, profitPercent);
    S().addQuotation({
      customerId, jobId, partsCost, laborCost, transportCost,
      overheadPercent, profitPercent,
      subtotal: r.subtotal, overheadAmount: r.overheadAmount,
      profitAmount: r.profitAmount, total: r.total,
    });
    APP.toast('Quotation generated successfully');
    render();
  }

  return { render, calc, generateQuotation, loadJobCosts, loadService, addPart, clearForm };
})();
