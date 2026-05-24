/* =========================================================
   CD Engineering — Documents Module
   Job Sheet Generation, Signed Document Upload & Gallery
   ========================================================= */
window.APP = window.APP || {};

APP.Documents = (function () {
  const S = () => APP.Store;

  function render(action, id) {
    if (action === 'jobsheet' && id) return renderJobSheet(id);
    if (action === 'upload' && id) return renderUploadPage(id);
    renderDocumentList();
  }

  // ── Documents Browser (All Signed Documents) ─────────────
  async function renderDocumentList() {
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="fade-in"><div class="page-header"><h1>Documents</h1><p>Signed job sheets, invoices and uploaded documents</p></div><div class="card"><div class="card-body"><div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><h3>Loading documents...</h3></div></div></div></div>`;

    const docs = await S().getAllDocuments();
    const main2 = document.getElementById('main-content');
    main2.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-row">
            <div><h1>Documents</h1><p>Signed job sheets, invoices and uploaded documents</p></div>
            <span class="text-muted">${docs.length} document${docs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-body compact">
            ${docs.length ? buildDocTable(docs) : '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h3>No documents uploaded</h3><p>Upload signed job sheets from the job detail page.</p></div>'}
          </div>
        </div>
      </div>`;
  }

  function buildDocTable(docs) {
    const rows = docs.map(d => {
      const job = S().getJob(d.job_id);
      const cust = S().getCustomer(d.customer_id);
      const typeBadge = d.document_type === 'invoice' ? 'badge-paid' : 'badge-inprogress';
      const typeLabel = d.document_type === 'invoice' ? 'Invoice' : 'Job Sheet';
      const sizeKB = Math.round((d.file_size || 0) / 1024);
      return `<tr>
        <td><a href="/api/documents/${d.id}/file" target="_blank" class="text-primary" style="font-weight:600">${d.original_name}</a></td>
        <td><span class="badge ${typeBadge}"><span class="badge-dot"></span>${typeLabel}</span></td>
        <td>${cust ? cust.name : '—'}</td>
        <td>${job ? (job.jobNumber || '—') : '—'}</td>
        <td>${sizeKB} KB</td>
        <td>${S().formatDate(d.created_at)}</td>
        <td>
          <div class="btn-group">
            <a class="btn-icon" href="/api/documents/${d.id}/file" target="_blank" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
            ${APP.Auth.isAdmin() ? `<button class="btn-icon" onclick="APP.Documents.confirmDelete('${d.id}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr><th>File</th><th>Type</th><th>Customer</th><th>Job #</th><th>Size</th><th>Uploaded</th><th style="width:100px">Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ── Job Sheet Generator ──────────────────────────────────
  async function renderJobSheet(jobId) {
    const j = S().getJob(jobId);
    if (!j) { renderDocumentList(); return; }
    const cust = S().getCustomer(j.customerId);
    const tech = S().getTechnician(j.technicianId);
    const lorry = S().getLorry(j.lorryId);
    const service = S().getService(j.serviceId);
    const inv = S().getInvoiceByJob(jobId);
    const jobParts = await S().getJobParts(jobId);
    const pricing = S().calculatePricing(j.partsCost, j.laborCost, j.transportCost, j.overheadPercent, j.profitPercent);
    const main = document.getElementById('main-content');

    // Parts table rows
    let partsRows = '';
    if (jobParts.length) {
      partsRows = jobParts.map((jp, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${jp.name || '—'}</td>
          <td style="text-align:center">${jp.quantity}</td>
          <td style="text-align:right">${S().formatCurrency(jp.unit_price)}</td>
          <td style="text-align:right">${S().formatCurrency(jp.quantity * jp.unit_price)}</td>
        </tr>`).join('');
    } else {
      partsRows = `<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:16px">No parts recorded — manual entry space below</td></tr>`;
      // Add empty rows for manual writing
      for (let i = 0; i < 5; i++) {
        partsRows += `<tr><td style="text-align:center;height:28px">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
      }
    }

    main.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('jobs','detail','${j.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Job
          </button>
          <h1>Job Sheet — ${j.jobNumber || ''}</h1>
        </div>
        <div class="btn-group mb-20">
          <button class="btn btn-primary" onclick="APP.Documents.printJobSheet()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Print Job Sheet
          </button>
          <button class="btn btn-outline" onclick="APP.Documents.downloadJobSheetPDF('${j.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF
          </button>
        </div>

        <div class="job-sheet-print" id="jobSheetPrint">
          <!-- Header -->
          <div class="js-header">
            <div class="js-logo-section">
              <div class="js-logo-box">CD</div>
              <div>
                <h2>CD Engineering</h2>
                <p class="js-subtitle">Enterprises (PVT) Ltd</p>
                <p class="js-tagline">Air Conditioning Solutions</p>
              </div>
            </div>
            <div class="js-meta">
              <h1>JOB SHEET</h1>
              <div class="js-meta-grid">
                <div class="js-meta-item"><span class="js-meta-label">Job No:</span><span class="js-meta-value">${j.jobNumber || '—'}</span></div>
                <div class="js-meta-item"><span class="js-meta-label">Date:</span><span class="js-meta-value">${S().formatDate(j.date)}</span></div>
                ${inv ? `<div class="js-meta-item"><span class="js-meta-label">Invoice:</span><span class="js-meta-value">${inv.invoiceNumber}</span></div>` : ''}
                <div class="js-meta-item"><span class="js-meta-label">Status:</span><span class="js-meta-value">${j.status}</span></div>
              </div>
            </div>
          </div>

          <!-- Customer & Job Details -->
          <div class="js-details-grid">
            <div class="js-detail-box">
              <h4>Customer Details</h4>
              <div class="js-detail-row"><span>Name:</span><strong>${cust ? cust.name : '—'}</strong></div>
              <div class="js-detail-row"><span>Phone:</span><span>${cust ? cust.phone : '—'}</span></div>
              <div class="js-detail-row"><span>Address:</span><span>${cust ? cust.address : '—'}</span></div>
            </div>
            <div class="js-detail-box">
              <h4>Service Details</h4>
              <div class="js-detail-row"><span>Service Type:</span><strong>${j.serviceType}</strong></div>
              <div class="js-detail-row"><span>Service:</span><span>${service ? service.name : '—'}</span></div>
              <div class="js-detail-row"><span>Technician:</span><span>${tech ? tech.name + ' (' + tech.role + ')' : '—'}</span></div>
              <div class="js-detail-row"><span>Vehicle No:</span><span>${lorry ? lorry.lorryNumber : '—'}</span></div>
            </div>
          </div>

          <!-- Description -->
          <div class="js-section">
            <h4>Job Description / AC Unit Details</h4>
            <div class="js-description-box">${j.description || '<span style="color:var(--gray-400)">No description provided</span>'}</div>
          </div>

          <!-- Materials Used -->
          <div class="js-section">
            <h4>Materials / Parts Used</h4>
            <table class="js-parts-table">
              <thead>
                <tr><th style="width:50px">#</th><th>Description</th><th style="width:60px">Qty</th><th style="width:110px">Unit Price</th><th style="width:110px">Amount</th></tr>
              </thead>
              <tbody>
                ${partsRows}
              </tbody>
            </table>
          </div>

          <!-- Cost Summary -->
          <div class="js-cost-summary">
            <div class="js-cost-row"><span>Parts / Materials</span><span>${S().formatCurrency(j.partsCost || 0)}</span></div>
            <div class="js-cost-row"><span>Labor Charges</span><span>${S().formatCurrency(j.laborCost || 0)}</span></div>
            <div class="js-cost-row"><span>Transport</span><span>${S().formatCurrency(j.transportCost || 0)}</span></div>
            <div class="js-cost-row js-cost-subtotal"><span>Subtotal</span><span>${S().formatCurrency(pricing.subtotal)}</span></div>
            <div class="js-cost-row"><span>Overhead (${j.overheadPercent || 10}%)</span><span>${S().formatCurrency(pricing.overheadAmount)}</span></div>
            <div class="js-cost-row"><span>Profit (${j.profitPercent || 30}%)</span><span>${S().formatCurrency(pricing.profitAmount)}</span></div>
            <div class="js-cost-row js-cost-total"><span>Total</span><span>${S().formatCurrency(pricing.total)}</span></div>
          </div>

          <!-- Signatures -->
          <div class="js-signatures">
            <div class="js-signature-block">
              <div class="js-signature-line"></div>
              <p>Customer Signature</p>
              <span>Name: ${cust ? cust.name : '_______________'}</span>
            </div>
            <div class="js-signature-block">
              <div class="js-signature-line"></div>
              <p>Technician Signature</p>
              <span>Name: ${tech ? tech.name : '_______________'}</span>
            </div>
            <div class="js-signature-block">
              <div class="js-signature-line"></div>
              <p>Authorized By</p>
              <span>CD Engineering</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="js-footer">
            <p><strong>CD Engineering Enterprises (PVT) Ltd</strong> — Air Conditioning Solutions</p>
            <p>Thank you for your business. For inquiries, please contact us.</p>
          </div>
        </div>
      </div>`;
  }

  function printJobSheet() {
    window.print();
  }

  function downloadJobSheetPDF(jobId) {
    const el = document.getElementById('jobSheetPrint');
    if (!el) return;
    const j = S().getJob(jobId);
    const opt = {
      margin: [8, 8],
      filename: (j ? (j.jobNumber || 'job-sheet') : 'job-sheet') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save();
    APP.toast('PDF download started');
  }

  // ── Upload Page for a specific job ──────────────────────
  async function renderUploadPage(jobId) {
    const j = S().getJob(jobId);
    if (!j) { renderDocumentList(); return; }
    const cust = S().getCustomer(j.customerId);
    const docs = await S().getDocumentsByJob(jobId);
    const main = document.getElementById('main-content');

    main.innerHTML = `
      <div class="fade-in">
        <div class="detail-header">
          <button class="btn btn-outline btn-sm btn-back" onclick="APP.Router.navigate('jobs','detail','${j.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Job
          </button>
          <h1>Upload Signed Document</h1>
          <span class="text-muted" style="margin-left:12px">${j.jobNumber || ''} — ${cust ? cust.name : '—'}</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <!-- Upload Zone -->
          <div class="card">
            <div class="card-header"><h3>Upload Document</h3></div>
            <div class="card-body">
              <div class="doc-upload-zone" id="dropZone" onclick="document.getElementById('docFileInput').click()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <h3>Drop file here or click to browse</h3>
                <p>Supports: JPG, PNG, WebP, PDF (max 10MB)</p>
                <div id="uploadPreview" style="display:none;margin-top:16px"></div>
              </div>
              <input type="file" id="docFileInput" accept="image/*,.pdf" style="display:none" onchange="APP.Documents.handleFileSelect(this)">
              <div class="form-group" style="margin-top:16px">
                <label>Document Type</label>
                <select class="form-control" id="docType">
                  <option value="job_sheet">Signed Job Sheet</option>
                  <option value="invoice">Signed Invoice</option>
                </select>
              </div>
              <div class="form-group">
                <label>Notes (optional)</label>
                <input class="form-control" type="text" id="docNotes" placeholder="e.g. Scanned at site">
              </div>
              <button class="btn btn-primary" id="uploadBtn" onclick="APP.Documents.submitUpload('${j.id}', '${j.customerId}')" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Document
              </button>
            </div>
          </div>

          <!-- Uploaded Documents -->
          <div class="card">
            <div class="card-header"><h3>Uploaded Documents (${docs.length})</h3></div>
            <div class="card-body compact">
              ${docs.length ? buildDocGallery(docs) : '<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h3>No documents yet</h3><p>Upload a signed job sheet or invoice.</p></div>'}
            </div>
          </div>
        </div>
      </div>`;

    // Setup drag-and-drop
    setupDragDrop();
  }

  function buildDocGallery(docs) {
    return `<div class="doc-gallery">${docs.map(d => {
      const isImage = /image/i.test(d.mime_type);
      const sizeKB = Math.round((d.file_size || 0) / 1024);
      const typeLabel = d.document_type === 'invoice' ? 'Invoice' : 'Job Sheet';
      return `<div class="doc-gallery-item">
        <a href="/api/documents/${d.id}/file" target="_blank" class="doc-thumb">
          ${isImage ? `<img src="/api/documents/${d.id}/file" alt="${d.original_name}">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'}
        </a>
        <div class="doc-info">
          <strong title="${d.original_name}">${d.original_name.length > 20 ? d.original_name.substring(0, 18) + '...' : d.original_name}</strong>
          <span>${typeLabel} • ${sizeKB} KB</span>
          <span>${S().formatDate(d.created_at)}</span>
        </div>
        <div class="doc-actions">
          <a class="btn-icon" href="/api/documents/${d.id}/file" target="_blank" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
          ${APP.Auth.isAdmin() ? `<button class="btn-icon" onclick="APP.Documents.confirmDelete('${d.id}')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  // ── Inline Document Gallery (for embedding in job detail) ─
  function buildInlineDocGallery(docs) {
    return buildDocGallery(docs);
  }

  // ── File Handling ────────────────────────────────────────
  let selectedFile = null;

  function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;
    selectedFile = file;
    const preview = document.getElementById('uploadPreview');
    const btn = document.getElementById('uploadBtn');
    if (preview) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid var(--gray-200)"><p style="font-size:12px;color:var(--gray-500);margin-top:8px">${file.name} (${Math.round(file.size/1024)} KB)</p>`; };
        reader.readAsDataURL(file);
      } else {
        preview.innerHTML = `<div style="padding:12px;background:var(--gray-50);border-radius:8px;border:1px solid var(--gray-200)"><strong>${file.name}</strong><br><span style="font-size:12px;color:var(--gray-500)">${Math.round(file.size/1024)} KB</span></div>`;
      }
      preview.style.display = 'block';
    }
    if (btn) btn.disabled = false;
  }

  async function submitUpload(jobId, customerId) {
    if (!selectedFile) { APP.toast('Please select a file', 'error'); return; }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('jobId', jobId);
    formData.append('customerId', customerId);
    formData.append('documentType', document.getElementById('docType').value);
    formData.append('notes', document.getElementById('docNotes').value);

    const btn = document.getElementById('uploadBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Uploading...'; }

    const result = await S().uploadDocument(formData);
    if (result) {
      APP.toast('Document uploaded successfully');
      selectedFile = null;
      renderUploadPage(jobId);
    } else {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Upload Document'; }
    }
  }

  function setupDragDrop() {
    const zone = document.getElementById('dropZone');
    if (!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        const input = document.getElementById('docFileInput');
        input.files = e.dataTransfer.files;
        handleFileSelect(input);
      }
    });
  }

  // ── Delete ──────────────────────────────────────────────
  function confirmDelete(id) {
    APP.confirm({
      title: 'Delete Document?',
      message: 'This will permanently delete the uploaded document. This cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        await S().deleteDocument(id);
        APP.toast('Document deleted');
        // Re-render current view
        const hash = window.location.hash;
        if (hash.includes('documents')) {
          const parts = hash.replace('#', '').split('/');
          if (parts[1] === 'upload' && parts[2]) renderUploadPage(parts[2]);
          else renderDocumentList();
        } else {
          // Might be on a job detail page
          const jobMatch = hash.match(/jobs\/detail\/(.+)/);
          if (jobMatch) APP.Jobs.render('detail', jobMatch[1]);
        }
      }
    });
  }

  return { render, renderJobSheet, renderUploadPage, printJobSheet, downloadJobSheetPDF, handleFileSelect, submitUpload, confirmDelete, buildInlineDocGallery };
})();
