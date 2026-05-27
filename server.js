require('dotenv').config();
/* =========================================================
   CD Engineering — Express Server (v3.0)
   ========================================================= */
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./server/db');
const { requireAuth, requireAdmin } = require('./server/auth');
const backup = require('./server/backup');
const multer = require('multer');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
const PORT = process.env.PORT || 3000;
const SESSION_MAX_AGE = 20 * 60 * 1000; // 20 minutes

// ── Multer Config (File Upload) ───────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const extOk = /\.(jpe?g|png|gif|webp|pdf|heic)$/i.test(path.extname(file.originalname));
    const mimeOk = /^(image\/(jpeg|png|gif|webp|heic)|application\/pdf)$/i.test(file.mimetype);
    if (!extOk || !mimeOk) return cb(new Error('Only image and PDF uploads are allowed'));
    cb(null, true);
  }
});

// ── Middleware ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  },
  rolling: true, // Reset maxAge on every response
}));

// Serve static frontend files
app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));
app.use('/vendor/html2pdf.js', express.static(path.join(__dirname, 'node_modules', 'html2pdf.js', 'dist')));
app.use(express.static(path.join(__dirname, 'public'), {
  index: false, // We handle index route ourselves
  extensions: ['html'],
}));

// ── Brute Force Protection ────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth Routes ───────────────────────────────────────────
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.user = { id: user.id, username: user.username, displayName: user.display_name, role: user.role };
  res.json({ success: true, user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', time: new Date().toISOString() });
});

// ── All API routes below require authentication ───────────
app.use('/api', requireAuth);

// ── Customers ─────────────────────────────────────────────
app.get('/api/customers', (req, res) => {
  res.json(db.all('SELECT * FROM customers ORDER BY name'));
});

app.get('/api/customers/:id', (req, res) => {
  const c = db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  c ? res.json(c) : res.status(404).json({ error: 'Customer not found' });
});

app.post('/api/customers', (req, res) => {
  const { name, phone, address, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  const id = uuidv4();
  db.run('INSERT INTO customers (id, name, phone, address, notes) VALUES (?,?,?,?,?)',
    [id, name.trim(), phone.trim(), (address || '').trim(), (notes || '').trim()]);
  res.json(db.get('SELECT * FROM customers WHERE id = ?', [id]));
});

app.put('/api/customers/:id', (req, res) => {
  const { name, phone, address, notes } = req.body;
  const existing = db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  db.run("UPDATE customers SET name=?, phone=?, address=?, notes=?, updated_at=datetime('now') WHERE id=?",
    [name || existing.name, phone || existing.phone, address ?? existing.address, notes ?? existing.notes, req.params.id]);
  res.json(db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]));
});

app.delete('/api/customers/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Lorries ─────────────────────────────────────────────────
app.get('/api/lorries', (req, res) => {
  res.json(db.all('SELECT * FROM lorries ORDER BY lorry_number'));
});

app.post('/api/lorries', requireAdmin, (req, res) => {
  const { lorryNumber, assignedArea, status } = req.body;
  if (!lorryNumber) return res.status(400).json({ error: 'Lorry number required' });
  const id = uuidv4();
  db.run('INSERT INTO lorries (id, lorry_number, assigned_area, status) VALUES (?,?,?,?)',
    [id, lorryNumber.trim(), (assignedArea||'').trim(), status||'Active']);
  res.json(db.get('SELECT * FROM lorries WHERE id = ?', [id]));
});

app.put('/api/lorries/:id', requireAdmin, (req, res) => {
  const { lorryNumber, assignedArea, status } = req.body;
  const existing = db.get('SELECT * FROM lorries WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Lorry not found' });
  db.run('UPDATE lorries SET lorry_number=?, assigned_area=?, status=? WHERE id=?',
    [lorryNumber || existing.lorry_number, assignedArea ?? existing.assigned_area, status || existing.status, req.params.id]);
  res.json(db.get('SELECT * FROM lorries WHERE id = ?', [req.params.id]));
});

app.delete('/api/lorries/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM lorries WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Services ────────────────────────────────────────────────
app.get('/api/services', (req, res) => {
  res.json(db.all('SELECT * FROM services ORDER BY name'));
});

app.post('/api/services', requireAdmin, (req, res) => {
  const { name, description, standardPrice, durationEstimate, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name required' });
  const id = uuidv4();
  db.run('INSERT INTO services (id, name, description, standard_price, duration_estimate, category) VALUES (?,?,?,?,?,?)',
    [id, name.trim(), (description||'').trim(), standardPrice||0, (durationEstimate||'1h').trim(), (category||'General').trim()]);
  res.json(db.get('SELECT * FROM services WHERE id = ?', [id]));
});

app.put('/api/services/:id', requireAdmin, (req, res) => {
  const { name, description, standardPrice, durationEstimate, category } = req.body;
  const existing = db.get('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Service not found' });
  db.run('UPDATE services SET name=?, description=?, standard_price=?, duration_estimate=?, category=? WHERE id=?',
    [name || existing.name, description ?? existing.description, standardPrice ?? existing.standard_price, durationEstimate ?? existing.duration_estimate, category ?? existing.category ?? 'General', req.params.id]);
  res.json(db.get('SELECT * FROM services WHERE id = ?', [req.params.id]));
});

app.delete('/api/services/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM services WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Parts ───────────────────────────────────────────────────
app.get('/api/parts', (req, res) => {
  res.json(db.all('SELECT * FROM parts ORDER BY name'));
});

app.post('/api/parts', requireAdmin, (req, res) => {
  const { name, category, unitPrice, stock } = req.body;
  if (!name) return res.status(400).json({ error: 'Part name required' });
  const id = uuidv4();
  db.run('INSERT INTO parts (id, name, category, unit_price, stock) VALUES (?,?,?,?,?)',
    [id, name.trim(), (category||'').trim(), unitPrice||0, stock||0]);
  res.json(db.get('SELECT * FROM parts WHERE id = ?', [id]));
});

app.put('/api/parts/:id', requireAdmin, (req, res) => {
  const { name, category, unitPrice, stock } = req.body;
  const existing = db.get('SELECT * FROM parts WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Part not found' });
  db.run('UPDATE parts SET name=?, category=?, unit_price=?, stock=? WHERE id=?',
    [name || existing.name, category ?? existing.category, unitPrice ?? existing.unit_price, stock ?? existing.stock, req.params.id]);
  res.json(db.get('SELECT * FROM parts WHERE id = ?', [req.params.id]));
});

app.delete('/api/parts/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM parts WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Technicians ───────────────────────────────────────────
app.get('/api/technicians', (req, res) => {
  res.json(db.all('SELECT * FROM technicians ORDER BY name'));
});

app.get('/api/technicians/:id', (req, res) => {
  const t = db.get('SELECT * FROM technicians WHERE id = ?', [req.params.id]);
  t ? res.json(t) : res.status(404).json({ error: 'Technician not found' });
});

app.post('/api/technicians', (req, res) => {
  const { name, phone, specialization, role, lorryId } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  const id = uuidv4();
  db.run('INSERT INTO technicians (id, name, phone, specialization, role, lorry_id) VALUES (?,?,?,?,?,?)',
    [id, name.trim(), phone.trim(), (specialization || '').trim(), role || 'Junior', lorryId || '']);
  res.json(db.get('SELECT * FROM technicians WHERE id = ?', [id]));
});

app.put('/api/technicians/:id', (req, res) => {
  const { name, phone, specialization, role, lorryId } = req.body;
  const existing = db.get('SELECT * FROM technicians WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Technician not found' });
  db.run("UPDATE technicians SET name=?, phone=?, specialization=?, role=?, lorry_id=?, updated_at=datetime('now') WHERE id=?",
    [name || existing.name, phone || existing.phone, specialization ?? existing.specialization, role || existing.role, lorryId ?? existing.lorry_id, req.params.id]);
  res.json(db.get('SELECT * FROM technicians WHERE id = ?', [req.params.id]));
});

app.delete('/api/technicians/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM technicians WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Jobs ──────────────────────────────────────────────────
app.get('/api/jobs', (req, res) => {
  res.json(db.all('SELECT * FROM jobs ORDER BY date DESC'));
});

app.get('/api/jobs/:id', (req, res) => {
  const j = db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
  j ? res.json(j) : res.status(404).json({ error: 'Job not found' });
});

app.post('/api/jobs', (req, res) => {
  const b = req.body;
  if (!b.customerId || !b.date) return res.status(400).json({ error: 'Customer and date required' });
  const id = uuidv4();
  const jobNumber = db.nextJobNumber();
  db.run(`INSERT INTO jobs (id, job_number, customer_id, service_id, lorry_id, service_type, description, technician_id, status, date,
    parts_cost, labor_cost, transport_cost, overhead_percent, profit_percent) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, jobNumber, b.customerId, b.serviceId || '', b.lorryId || '', b.serviceType || 'Repair', b.description || '', b.technicianId || '', b.status || 'Pending',
     b.date, b.partsCost||0, b.laborCost||0, b.transportCost||0, b.overheadPercent||10, b.profitPercent||30]);
  res.json(mapJob(db.get('SELECT * FROM jobs WHERE id = ?', [id])));
});

app.put('/api/jobs/:id', (req, res) => {
  const existing = db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  const b = req.body;
  const newStatus = b.status || existing.status;
  
  db.run(`UPDATE jobs SET customer_id=?, service_id=?, lorry_id=?, service_type=?, description=?, technician_id=?, status=?, date=?,
    parts_cost=?, labor_cost=?, transport_cost=?, overhead_percent=?, profit_percent=?, updated_at=datetime('now') WHERE id=?`,
    [b.customerId||existing.customer_id, b.serviceId??existing.service_id, b.lorryId??existing.lorry_id, b.serviceType||existing.service_type, b.description??existing.description,
     b.technicianId??existing.technician_id, newStatus, b.date||existing.date,
     b.partsCost??existing.parts_cost, b.laborCost??existing.labor_cost, b.transportCost??existing.transport_cost,
     b.overheadPercent??existing.overhead_percent, b.profitPercent??existing.profit_percent, req.params.id]);

  if (newStatus !== existing.status) {
    db.run('INSERT INTO job_history (id, job_id, status, notes, updated_by) VALUES (?,?,?,?,?)',
      [uuidv4(), req.params.id, newStatus, 'Status updated', req.session?.user?.username || 'system']);
  }
     
  res.json(mapJob(db.get('SELECT * FROM jobs WHERE id = ?', [req.params.id])));
});

app.delete('/api/jobs/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM invoices WHERE job_id = ?', [req.params.id]);
  db.run('DELETE FROM jobs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/jobs/:id/parts', (req, res) => {
  res.json(db.all('SELECT jp.*, p.name FROM job_parts jp JOIN parts p ON jp.part_id = p.id WHERE jp.job_id = ?', [req.params.id]));
});

app.post('/api/jobs/:id/parts', (req, res) => {
  const { partId, quantity } = req.body;
  const qty = parseInt(quantity, 10) || 1;
  const part = db.get('SELECT * FROM parts WHERE id = ?', [partId]);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  if (part.stock < qty) return res.status(400).json({ error: 'Not enough stock' });
  
  const id = uuidv4();
  db.run('INSERT INTO job_parts (id, job_id, part_id, quantity, unit_price) VALUES (?,?,?,?,?)', [id, req.params.id, partId, qty, part.unit_price]);
  db.run('UPDATE parts SET stock = stock - ? WHERE id = ?', [qty, partId]);
  
  db.run('UPDATE jobs SET parts_cost = parts_cost + ? WHERE id = ?', [qty * part.unit_price, req.params.id]);
  
  res.json({ success: true, part: db.get('SELECT * FROM job_parts WHERE id = ?', [id]) });
});

app.delete('/api/jobs/:id/parts/:jobPartId', (req, res) => {
  const jp = db.get('SELECT * FROM job_parts WHERE id = ? AND job_id = ?', [req.params.jobPartId, req.params.id]);
  if (!jp) return res.status(404).json({ error: 'Job part not found' });
  
  db.run('DELETE FROM job_parts WHERE id = ?', [req.params.jobPartId]);
  db.run('UPDATE parts SET stock = stock + ? WHERE id = ?', [jp.quantity, jp.part_id]);
  
  db.run('UPDATE jobs SET parts_cost = parts_cost - ? WHERE id = ?', [jp.quantity * jp.unit_price, req.params.id]);
  
  res.json({ success: true });
});

app.get('/api/jobs/:id/history', (req, res) => {
  res.json(db.all('SELECT * FROM job_history WHERE job_id = ? ORDER BY created_at DESC', [req.params.id]));
});

// ── Invoices ──────────────────────────────────────────────
app.get('/api/invoices', (req, res) => {
  res.json(db.all('SELECT * FROM invoices ORDER BY created_at DESC').map(mapInvoice));
});

app.get('/api/invoices/:id', (req, res) => {
  const inv = db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  inv ? res.json(mapInvoice(inv)) : res.status(404).json({ error: 'Invoice not found' });
});

app.post('/api/invoices', (req, res) => {
  const b = req.body;
  if (!b.jobId || !b.customerId) return res.status(400).json({ error: 'Job and customer required' });
  // Prevent duplicate invoices for same job
  const existing = db.get('SELECT * FROM invoices WHERE job_id = ?', [b.jobId]);
  if (existing) return res.status(409).json({ error: 'Invoice already exists for this job', invoice: mapInvoice(existing) });

  const pricing = db.calculatePricing(b.partsCost, b.laborCost, b.transportCost, b.overheadPercent, b.profitPercent);
  const id = uuidv4();
  const invNum = db.nextInvoiceNumber();
  db.run(`INSERT INTO invoices (id, invoice_number, job_id, customer_id, parts_cost, labor_cost, transport_cost,
    overhead_percent, profit_percent, subtotal, overhead_amount, profit_amount, total, status, finalized) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, invNum, b.jobId, b.customerId, b.partsCost||0, b.laborCost||0, b.transportCost||0,
     b.overheadPercent||10, b.profitPercent||30, pricing.subtotal, pricing.overheadAmount, pricing.profitAmount, pricing.total, 'Unpaid', 0]);
  res.json(mapInvoice(db.get('SELECT * FROM invoices WHERE id = ?', [id])));
});

app.put('/api/invoices/:id', (req, res) => {
  const existing = db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });
  // Only admin can edit finalized invoices
  if (existing.finalized && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot modify finalized invoice. Admin access required.' });
  }
  const b = req.body;
  if (b.status === 'Paid' && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admin can mark invoices as paid.' });
  }
  const status = b.status || existing.status;
  const finalized = status === 'Paid' ? 1 : (b.finalized ?? existing.finalized);
  db.run("UPDATE invoices SET status=?, finalized=?, updated_at=datetime('now') WHERE id=?",
    [status, finalized, req.params.id]);
  res.json(mapInvoice(db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id])));
});

// ── Quotations ────────────────────────────────────────────
app.get('/api/quotations', (req, res) => {
  res.json(db.all('SELECT * FROM quotations ORDER BY created_at DESC'));
});

app.post('/api/quotations', (req, res) => {
  const b = req.body;
  const pricing = db.calculatePricing(b.partsCost, b.laborCost, b.transportCost, b.overheadPercent, b.profitPercent);
  const id = uuidv4();
  const qNum = db.nextQuotationNumber();
  db.run(`INSERT INTO quotations (id, quotation_number, customer_id, job_id, parts_cost, labor_cost, transport_cost,
    overhead_percent, profit_percent, subtotal, overhead_amount, profit_amount, total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, qNum, b.customerId||'', b.jobId||'', b.partsCost||0, b.laborCost||0, b.transportCost||0,
     b.overheadPercent||10, b.profitPercent||30, pricing.subtotal, pricing.overheadAmount, pricing.profitAmount, pricing.total]);
  res.json(db.get('SELECT * FROM quotations WHERE id = ?', [id]));
});

// ── Stats ─────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const jobs = db.all('SELECT * FROM jobs');
  const invoices = db.all('SELECT * FROM invoices');
  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.total || 0), 0);
  const unpaidRevenue = invoices.filter(i => i.status === 'Unpaid').reduce((s, i) => s + (i.total || 0), 0);
  const totalProfit = invoices.reduce((s, i) => s + (i.profit_amount || 0), 0);
  const totalCost = invoices.reduce((s, i) => s + (i.subtotal || 0), 0);

  // Revenue by service type
  const revenueByService = {};
  invoices.forEach(inv => {
    if (inv.status === 'Paid' && inv.job_id) {
      const job = jobs.find(j => j.id === inv.job_id);
      if (job) {
        revenueByService[job.service_type] = (revenueByService[job.service_type] || 0) + (inv.total || 0);
      }
    }
  });

  res.json({
    totalJobs: jobs.length,
    pendingJobs: jobs.filter(j => j.status === 'Pending').length,
    inProgressJobs: jobs.filter(j => j.status === 'In Progress').length,
    completedJobs: jobs.filter(j => j.status === 'Completed').length,
    totalRevenue, paidRevenue, unpaidRevenue, totalProfit, totalCost,
    totalCustomers: db.all('SELECT COUNT(*) as c FROM customers')[0].c,
    totalTechnicians: db.all('SELECT COUNT(*) as c FROM technicians')[0].c,
    totalLorries: db.all('SELECT COUNT(*) as c FROM lorries')[0].c,
    totalServices: db.all('SELECT COUNT(*) as c FROM services')[0].c,
    totalParts: db.all('SELECT COUNT(*) as c FROM parts')[0].c,
    totalInvoices: invoices.length,
    revenueByService
  });
});

app.get('/api/stats/monthly-revenue', (req, res) => {
  const invoices = db.all('SELECT * FROM invoices');
  const months = {};
  const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  invoices.forEach(inv => {
    const d = new Date(inv.created_at);
    const k = d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0');
    const label = mn[d.getMonth()] + ' ' + d.getFullYear();
    if (!months[k]) months[k] = { label, revenue: 0, profit: 0, cost: 0 };
    months[k].revenue += inv.total || 0;
    months[k].profit += inv.profit_amount || 0;
    months[k].cost += inv.subtotal || 0;
  });
  const sorted = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
  res.json({ labels: sorted.map(e => e[1].label), revenue: sorted.map(e => e[1].revenue), profit: sorted.map(e => e[1].profit), cost: sorted.map(e => e[1].cost) });
});

// ── Backup Routes (Admin Only) ────────────────────────────
app.post('/api/backup/create', requireAdmin, (req, res) => {
  try {
    const result = backup.createBackup('manual');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/backup/list', requireAdmin, (req, res) => {
  res.json(backup.listBackups());
});

app.post('/api/backup/restore', requireAdmin, (req, res) => {
  try {
    const result = backup.restoreBackup(req.body.filename);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/backup/export', requireAdmin, (req, res) => {
  const data = db.exportAllData();
  res.setHeader('Content-Disposition', `attachment; filename=cd_engineering_backup_${new Date().toISOString().split('T')[0]}.json`);
  res.json(data);
});

app.post('/api/backup/import', requireAdmin, (req, res) => {
  try {
    if (!req.body || !Array.isArray(req.body.customers) || !Array.isArray(req.body.jobs)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    db.importAllData(req.body);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/backup/reset-demo', requireAdmin, (req, res) => {
  try {
    db.resetDemoData();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── User Management (Admin Only) ──────────────────────────
app.get('/api/users', requireAdmin, (req, res) => {
  res.json(db.all('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at'));
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, displayName, role } = req.body;
  if (!username || !password || !displayName) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!['admin', 'staff'].includes(role)) return res.status(400).json({ error: 'Role must be admin or staff' });
  const normalizedUsername = username.trim().toLowerCase();
  const existing = db.get('SELECT id FROM users WHERE username = ?', [normalizedUsername]);
  if (existing) return res.status(409).json({ error: 'Username already exists' });
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?,?,?,?,?)',
    [id, normalizedUsername, hash, displayName.trim(), role]);
  res.json({ id, username: normalizedUsername, display_name: displayName.trim(), role });
});

app.put('/api/users/:id/password', requireAdmin, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const user = db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const hash = bcrypt.hashSync(password, 10);
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.session.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const user = db.get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') {
    const admins = db.get('SELECT COUNT(*) as c FROM users WHERE role = ?', ['admin']).c;
    if (admins <= 1) return res.status(400).json({ error: 'Cannot delete the last admin account' });
  }
  db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Signed Documents ─────────────────────────────────────
app.post('/api/documents/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { jobId, customerId, documentType, notes } = req.body;
  if (!jobId || !customerId) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(400).json({ error: 'Job and customer required' });
  }
  const job = db.get('SELECT id, customer_id FROM jobs WHERE id = ?', [jobId]);
  if (!job) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(404).json({ error: 'Job not found' });
  }
  if (job.customer_id !== customerId) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(400).json({ error: 'Document customer does not match job customer' });
  }
  const id = uuidv4();
  db.run(`INSERT INTO signed_documents (id, job_id, customer_id, document_type, filename, original_name, mime_type, file_size, uploaded_by, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, jobId, customerId, documentType || 'job_sheet', req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.session?.user?.username || '', notes || '']);
  res.json(db.get('SELECT * FROM signed_documents WHERE id = ?', [id]));
});

app.get('/api/documents', (req, res) => {
  const { jobId, customerId } = req.query;
  if (jobId) {
    res.json(db.all('SELECT * FROM signed_documents WHERE job_id = ? ORDER BY created_at DESC', [jobId]));
  } else if (customerId) {
    res.json(db.all('SELECT * FROM signed_documents WHERE customer_id = ? ORDER BY created_at DESC', [customerId]));
  } else {
    res.json(db.all('SELECT * FROM signed_documents ORDER BY created_at DESC'));
  }
});

app.get('/api/documents/:id/file', (req, res) => {
  const doc = db.get('SELECT * FROM signed_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const filePath = path.join(UPLOAD_DIR, path.basename(doc.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const safeOriginalName = path.basename(doc.original_name || 'document').replace(/[\r\n"]/g, '_');
  res.setHeader('Content-Type', doc.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${safeOriginalName}"`);
  res.sendFile(filePath);
});

app.delete('/api/documents/:id', requireAdmin, (req, res) => {
  const doc = db.get('SELECT * FROM signed_documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const filePath = path.join(UPLOAD_DIR, path.basename(doc.filename));
  try { fs.unlinkSync(filePath); } catch(e) {}
  db.run('DELETE FROM signed_documents WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── Serve index.html for all non-API routes ───────────────
app.use('/api', (err, req, res, next) => {
  console.error('[API Error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large. Maximum upload size is 10MB.' });
  }
  res.status(500).json({ error: err.message || 'Server error' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Row Mapping Helpers (snake_case → camelCase) ──────────
function mapJob(j) {
  if (!j) return null;
  return { id: j.id, jobNumber: j.job_number, customerId: j.customer_id, serviceId: j.service_id, lorryId: j.lorry_id, serviceType: j.service_type, description: j.description,
    technicianId: j.technician_id, status: j.status, date: j.date, partsCost: j.parts_cost, laborCost: j.labor_cost,
    transportCost: j.transport_cost, overheadPercent: j.overhead_percent, profitPercent: j.profit_percent,
    createdAt: j.created_at, updatedAt: j.updated_at };
}
function mapInvoice(inv) {
  if (!inv) return null;
  return { id: inv.id, invoiceNumber: inv.invoice_number, jobId: inv.job_id, customerId: inv.customer_id,
    partsCost: inv.parts_cost, laborCost: inv.labor_cost, transportCost: inv.transport_cost,
    overheadPercent: inv.overhead_percent, profitPercent: inv.profit_percent,
    subtotal: inv.subtotal, overheadAmount: inv.overhead_amount, profitAmount: inv.profit_amount, total: inv.total,
    status: inv.status, finalized: inv.finalized, createdAt: inv.created_at, updatedAt: inv.updated_at };
}

// ── Start Server ──────────────────────────────────────────
async function start() {
  await db.init();
  backup.scheduleAutoBackup();
  // Create initial backup on first start
  try { backup.createBackup('startup'); } catch (e) {}
  const adminUser = db.get('SELECT password_hash FROM users WHERE username = ?', ['admin']);
  const staffUser = db.get('SELECT password_hash FROM users WHERE username = ?', ['staff']);
  const defaultAccounts = {
    admin: adminUser ? bcrypt.compareSync('CDadmin@2026', adminUser.password_hash) : false,
    staff: staffUser ? bcrypt.compareSync('CDstaff@2026', staffUser.password_hash) : false,
  };

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║   CD Engineering Management System v3.0     ║');
    console.log('  ╠══════════════════════════════════════════════╣');
    console.log(`  ║   Local:   http://localhost:${PORT}             ║`);
    console.log(`  ║   Network: http://0.0.0.0:${PORT}              ║`);
    console.log('  ║   Status:  Ready                            ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
    if (defaultAccounts.admin || defaultAccounts.staff) {
      console.log('  Default credentials still active:');
      if (defaultAccounts.admin) console.log('    Admin - admin / CDadmin@2026');
      if (defaultAccounts.staff) console.log('    Staff - staff / CDstaff@2026');
      console.log('  Change these passwords before office use.');
    } else {
      console.log('  Default account passwords have been changed.');
    }
    console.log('');
  });
}

start().catch(e => { console.error('Failed to start server:', e); process.exit(1); });
