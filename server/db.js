/* =========================================================
   CD Engineering — Database Layer (better-sqlite3)
   ========================================================= */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, '..', 'data', 'cd_engineering.db');
let _db = null;

// ── Ensure data directory exists ──────────────────────────
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ── Initialize Database ───────────────────────────────────
async function init() {
  ensureDir(path.dirname(DB_PATH));

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  createSchema();

  // Check if seed data is needed
  const userCount = get('SELECT COUNT(*) as c FROM users').c;
  if (userCount === 0) {
    seedData();
  }

  return _db;
}

// ── Save database to disk ─────────────────────────────────
function persist() {
  // No-op: better-sqlite3 writes to disk immediately
}

// ── Schema ────────────────────────────────────────────────
function createSchema() {
  _db.exec(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','staff')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS lorries (
    id TEXT PRIMARY KEY,
    lorry_number TEXT NOT NULL,
    assigned_area TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Maintenance','Inactive')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    standard_price REAL DEFAULT 0,
    duration_estimate TEXT DEFAULT '1h',
    category TEXT DEFAULT 'General',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  try {
    _db.prepare('SELECT category FROM services LIMIT 1').get();
  } catch (e) {
    _db.exec("ALTER TABLE services ADD COLUMN category TEXT DEFAULT 'General'");
  }

  _db.exec(`CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    unit_price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    specialization TEXT DEFAULT '',
    role TEXT DEFAULT 'Junior' CHECK(role IN ('Senior','Junior')),
    lorry_id TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    job_number TEXT,
    customer_id TEXT NOT NULL,
    service_id TEXT DEFAULT '',
    lorry_id TEXT DEFAULT '',
    service_type TEXT NOT NULL,
    description TEXT DEFAULT '',
    technician_id TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Completed')),
    date TEXT NOT NULL,
    parts_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    transport_cost REAL DEFAULT 0,
    overhead_percent REAL DEFAULT 10,
    profit_percent REAL DEFAULT 30,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  // Migration: Add job_number column if missing
  try {
    _db.prepare('SELECT job_number FROM jobs LIMIT 1').get();
  } catch (e) {
    _db.exec('ALTER TABLE jobs ADD COLUMN job_number TEXT');
  }

  // Backfill job_numbers for existing jobs that don't have one
  const jobsWithoutNumber = all("SELECT id FROM jobs WHERE job_number IS NULL OR job_number = '' ORDER BY created_at ASC");
  jobsWithoutNumber.forEach((j, idx) => {
    const num = 'JOB-' + String(idx + 1).padStart(4, '0');
    run('UPDATE jobs SET job_number = ? WHERE id = ?', [num, j.id]);
  });

  _db.exec(`CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    job_id TEXT,
    customer_id TEXT NOT NULL,
    parts_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    transport_cost REAL DEFAULT 0,
    overhead_percent REAL DEFAULT 10,
    profit_percent REAL DEFAULT 30,
    subtotal REAL DEFAULT 0,
    overhead_amount REAL DEFAULT 0,
    profit_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'Unpaid' CHECK(status IN ('Paid','Unpaid')),
    finalized INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    quotation_number TEXT UNIQUE NOT NULL,
    customer_id TEXT DEFAULT '',
    job_id TEXT DEFAULT '',
    parts_cost REAL DEFAULT 0,
    labor_cost REAL DEFAULT 0,
    transport_cost REAL DEFAULT 0,
    overhead_percent REAL DEFAULT 10,
    profit_percent REAL DEFAULT 30,
    subtotal REAL DEFAULT 0,
    overhead_amount REAL DEFAULT 0,
    profit_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS job_parts (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    part_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id)
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS job_history (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT DEFAULT '',
    updated_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS signed_documents (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    document_type TEXT DEFAULT 'job_sheet',
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT DEFAULT 'image/jpeg',
    file_size INTEGER DEFAULT 0,
    uploaded_by TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Branch','SBU')),
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    last_service_date TEXT DEFAULT '',
    last_dp_service_date TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT UNIQUE NOT NULL,
    vendor TEXT DEFAULT '',
    category TEXT DEFAULT 'Other',
    amount REAL DEFAULT 0,
    date TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Unpaid' CHECK(status IN ('Paid','Unpaid')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.exec(`CREATE TABLE IF NOT EXISTS lorry_logs (
    id TEXT PRIMARY KEY,
    lorry_id TEXT NOT NULL,
    date TEXT NOT NULL,
    start_odometer REAL DEFAULT 0,
    end_odometer REAL DEFAULT 0,
    fuel_liters REAL DEFAULT 0,
    fuel_cost REAL DEFAULT 0,
    gps_summary TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lorry_id) REFERENCES lorries(id) ON DELETE CASCADE
  )`);

  // Migration: Add branch_id column to jobs if missing
  try {
    _db.prepare('SELECT branch_id FROM jobs LIMIT 1').get();
  } catch (e) {
    _db.exec('ALTER TABLE jobs ADD COLUMN branch_id TEXT');
  }

  // Migration: Add branch_id column to invoices if missing
  try {
    _db.prepare('SELECT branch_id FROM invoices LIMIT 1').get();
  } catch (e) {
    _db.exec('ALTER TABLE invoices ADD COLUMN branch_id TEXT');
  }
}

// ── Pricing Formula ───────────────────────────────────────
function calculatePricing(parts, labor, transport, overheadPct, profitPct) {
  parts = parseFloat(parts) || 0;
  labor = parseFloat(labor) || 0;
  transport = parseFloat(transport) || 0;
  overheadPct = parseFloat(overheadPct) || 0;
  profitPct = parseFloat(profitPct) || 0;
  const subtotal = parts + labor + transport;
  const afterOverhead = subtotal * (1 + overheadPct / 100);
  const overheadAmount = afterOverhead - subtotal;
  const total = afterOverhead * (1 + profitPct / 100);
  const profitAmount = total - afterOverhead;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    overheadAmount: Math.round(overheadAmount * 100) / 100,
    afterOverhead: Math.round(afterOverhead * 100) / 100,
    profitAmount: Math.round(profitAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ── Seed Data ─────────────────────────────────────────────
function seedData() {
  // Users
  const adminHash = bcrypt.hashSync('CDadmin@2026', 10);
  const staffHash = bcrypt.hashSync('CDstaff@2026', 10);
  run("INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))", [uuidv4(), 'admin', adminHash, 'Administrator', 'admin']);
  run("INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))", [uuidv4(), 'staff', staffHash, 'Staff User', 'staff']);

  seedBusinessData();
}

function seedBusinessData() {
  // Lorries
  const lA = uuidv4(), lB = uuidv4();
  run("INSERT INTO lorries VALUES (?,?,?,?,datetime('now'))", [lA, 'WP-LM-1234', 'Colombo', 'Active']);
  run("INSERT INTO lorries VALUES (?,?,?,?,datetime('now'))", [lB, 'WP-LK-9876', 'Kandy', 'Active']);

  // Services
  const sInstall = uuidv4(), sRepair = uuidv4(), sRefill = uuidv4(), sClean = uuidv4();
  run("INSERT INTO services VALUES (?,?,?,?,?,?,datetime('now'))", [sInstall, 'AC Installation', 'Standard split AC installation', 8000, '3h', 'Installation']);
  run("INSERT INTO services VALUES (?,?,?,?,?,?,datetime('now'))", [sRepair, 'AC Repair', 'Troubleshooting and repair', 5000, '2h', 'Repair']);
  run("INSERT INTO services VALUES (?,?,?,?,?,?,datetime('now'))", [sRefill, 'AC Gas Refill', 'R410A / R32 gas refill', 3000, '1h', 'Gas Refill']);
  run("INSERT INTO services VALUES (?,?,?,?,?,?,datetime('now'))", [sClean, 'Full Service Cleaning', 'Deep cleaning of indoor and outdoor units', 3500, '2h', 'Maintenance']);

  // Parts
  const pCompressor = uuidv4(), pFilter = uuidv4(), pPipe = uuidv4();
  run("INSERT INTO parts VALUES (?,?,?,?,?,datetime('now'))", [pCompressor, 'Inverter Compressor', 'Compressor', 45000, 10]);
  run("INSERT INTO parts VALUES (?,?,?,?,?,datetime('now'))", [pFilter, 'Air Filter', 'Filter', 1500, 50]);
  run("INSERT INTO parts VALUES (?,?,?,?,?,datetime('now'))", [pPipe, 'Copper Piping (1m)', 'Pipe', 2000, 100]);

  // Technicians
  const tK = uuidv4(), tN = uuidv4(), tR = uuidv4();
  run('INSERT INTO technicians VALUES (?,?,?,?,?,?,?,?)', [tK, 'Kamal Perera', '0771234501', 'Installation', 'Senior', lA, '2025-06-15T08:00:00Z', '2025-06-15T08:00:00Z']);
  run('INSERT INTO technicians VALUES (?,?,?,?,?,?,?,?)', [tN, 'Nuwan Silva', '0771234502', 'Repair', 'Junior', lA, '2025-07-01T08:00:00Z', '2025-07-01T08:00:00Z']);
  run('INSERT INTO technicians VALUES (?,?,?,?,?,?,?,?)', [tR, 'Ranjith Fernando', '0771234503', 'Gas Refill', 'Senior', lB, '2025-08-10T08:00:00Z', '2025-08-10T08:00:00Z']);

  // Customers
  const cS = uuidv4(), cP = uuidv4(), cNi = uuidv4(), cD = uuidv4(), cM = uuidv4();
  run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cS, 'Samantha Jayawardena', '0771234567', '45 Galle Road, Colombo 03', 'VIP customer — 3 office units', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z']);
  run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cP, 'Priyantha Kumara', '0779876543', '12 Kandy Road, Kadawatha', '', '2025-09-15T08:00:00Z', '2025-09-15T08:00:00Z']);
  run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cNi, 'Nishantha Bandara', '0775551234', '78 Main Street, Negombo', 'Prefers morning appointments', '2025-10-05T08:00:00Z', '2025-10-05T08:00:00Z']);
  run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cD, 'Dilani Weerasinghe', '0773334567', '23 Temple Road, Nugegoda', '', '2025-11-10T08:00:00Z', '2025-11-10T08:00:00Z']);
  run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cM, 'Mahesh Rathnayake', '0776667890', '56 Lake Road, Kurunegala', 'Service contract', '2025-12-01T08:00:00Z', '2025-12-01T08:00:00Z']);

  // Jobs (with job_number as 2nd column)
  const jobs = [
    [uuidv4(), 'JOB-0001', cS, sInstall, lA, 'Installation', '2-ton split AC — main office', tK, 'Completed', '2026-01-10', 45000, 8000, 2000, 10, 30, '2026-01-08T08:00:00Z'],
    [uuidv4(), 'JOB-0002', cP, sRepair, lA, 'Repair', 'Compressor not working', tN, 'Completed', '2026-01-22', 12000, 5000, 1500, 10, 30, '2026-01-20T08:00:00Z'],
    [uuidv4(), 'JOB-0003', cNi, sClean, lB, 'Service', 'Annual maintenance — 2 units', tN, 'Completed', '2026-02-05', 3000, 4000, 1500, 10, 30, '2026-02-03T08:00:00Z'],
    [uuidv4(), 'JOB-0004', cS, sRefill, lA, 'Gas Refill', 'R410A gas refill — conference room', tR, 'Completed', '2026-02-18', 8000, 3000, 1000, 10, 30, '2026-02-16T08:00:00Z'],
    [uuidv4(), 'JOB-0005', cD, sInstall, lB, 'Installation', '1.5-ton inverter AC — bedroom', tK, 'Completed', '2026-03-10', 38000, 7000, 2500, 10, 30, '2026-03-08T08:00:00Z'],
    [uuidv4(), 'JOB-0006', cM, sRepair, lA, 'Repair', 'Water leaking from indoor unit', tN, 'In Progress', '2026-04-25', 5000, 4000, 2000, 10, 30, '2026-04-23T08:00:00Z'],
    [uuidv4(), 'JOB-0007', cNi, sClean, lB, 'Service', 'Full cleaning and filter replacement', tR, 'Pending', '2026-05-02', 2500, 3500, 1500, 10, 30, '2026-04-28T08:00:00Z'],
    [uuidv4(), 'JOB-0008', cP, sInstall, lA, 'Installation', '3-ton cassette AC — shop floor', tK, 'Pending', '2026-05-05', 85000, 15000, 3000, 10, 30, '2026-04-30T08:00:00Z'],
  ];
  jobs.forEach(j => {
    run(`INSERT INTO jobs (id, job_number, customer_id, service_id, lorry_id, service_type, description, technician_id, status, date,
         parts_cost, labor_cost, transport_cost, overhead_percent, profit_percent, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`, j);
  });

  // Invoices for completed jobs (first 5)
  for (let i = 0; i < 5; i++) {
    const j = jobs[i];
    const p = calculatePricing(j[10], j[11], j[12], j[13], j[14]);
    const invNum = 'INV-' + String(i + 1).padStart(4, '0');
    const invDate = new Date(new Date(j[15]).getTime() + 2 * 86400000).toISOString();
    run(`INSERT INTO invoices
      (id, invoice_number, job_id, customer_id, parts_cost, labor_cost, transport_cost, overhead_percent,
       profit_percent, subtotal, overhead_amount, profit_amount, total, status, finalized, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
      [uuidv4(), invNum, j[0], j[2], j[10], j[11], j[12], j[13], j[14],
       p.subtotal, p.overheadAmount, p.profitAmount, p.total,
       i < 4 ? 'Paid' : 'Unpaid', i < 4 ? 1 : 0, invDate]);
  }
}

// ── Query Helpers ─────────────────────────────────────────
function all(sql, params = []) {
  try {
    return _db.prepare(sql).all(params);
  } catch (e) {
    console.error('SQL Error (all):', sql, params, e);
    throw e;
  }
}

function get(sql, params = []) {
  try {
    return _db.prepare(sql).get(params) || null;
  } catch (e) {
    console.error('SQL Error (get):', sql, params, e);
    throw e;
  }
}

function run(sql, params = []) {
  try {
    return _db.prepare(sql).run(params);
  } catch (e) {
    console.error('SQL Error (run):', sql, params, e);
    throw e;
  }
}

function getDb() { return _db; }

// ── Next Invoice/Quotation/Job Number ─────────────────────
function nextInvoiceNumber() {
  const row = get("SELECT invoice_number FROM invoices ORDER BY invoice_number DESC LIMIT 1");
  if (!row) return 'INV-0001';
  const num = parseInt(row.invoice_number.replace('INV-', ''), 10);
  return 'INV-' + String(num + 1).padStart(4, '0');
}

function nextQuotationNumber() {
  const row = get("SELECT quotation_number FROM quotations ORDER BY quotation_number DESC LIMIT 1");
  if (!row) return 'QTN-0001';
  const num = parseInt(row.quotation_number.replace('QTN-', ''), 10);
  return 'QTN-' + String(num + 1).padStart(4, '0');
}

function nextJobNumber() {
  const row = get("SELECT job_number FROM jobs WHERE job_number IS NOT NULL ORDER BY job_number DESC LIMIT 1");
  if (!row || !row.job_number) return 'JOB-0001';
  const num = parseInt(row.job_number.replace('JOB-', ''), 10);
  return 'JOB-' + String(num + 1).padStart(4, '0');
}

// ── Export for backup ─────────────────────────────────────
function exportAllData() {
  return {
    lorries: all('SELECT * FROM lorries'),
    services: all('SELECT * FROM services'),
    parts: all('SELECT * FROM parts'),
    customers: all('SELECT * FROM customers'),
    technicians: all('SELECT * FROM technicians'),
    branches: all('SELECT * FROM branches'),
    jobs: all('SELECT * FROM jobs'),
    invoices: all('SELECT * FROM invoices'),
    invoice_items: all('SELECT * FROM invoice_items'),
    quotations: all('SELECT * FROM quotations'),
    job_parts: all('SELECT * FROM job_parts'),
    job_history: all('SELECT * FROM job_history'),
    bills: all('SELECT * FROM bills'),
    lorry_logs: all('SELECT * FROM lorry_logs'),
    signed_documents: all('SELECT * FROM signed_documents'),
    exportedAt: new Date().toISOString(),
  };
}

function clearBusinessData() {
  run('DELETE FROM signed_documents');
  run('DELETE FROM job_history');
  run('DELETE FROM job_parts');
  run('DELETE FROM invoice_items');
  run('DELETE FROM invoices');
  run('DELETE FROM quotations');
  run('DELETE FROM jobs');
  run('DELETE FROM customers');
  run('DELETE FROM technicians');
  run('DELETE FROM lorry_logs');
  run('DELETE FROM lorries');
  run('DELETE FROM services');
  run('DELETE FROM parts');
  run('DELETE FROM bills');
  run('DELETE FROM branches');
}

function importAllData(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup data');
  const tx = _db.transaction(() => {
    clearBusinessData();

    (data.lorries || []).forEach(l => {
      run('INSERT OR REPLACE INTO lorries VALUES (?,?,?,?,?)',
        [l.id, l.lorry_number, l.assigned_area||'', l.status||'Active', l.created_at || new Date().toISOString()]);
    });
    (data.services || []).forEach(s => {
      run('INSERT OR REPLACE INTO services VALUES (?,?,?,?,?,?,?)',
        [s.id, s.name, s.description||'', s.standard_price||0, s.duration_estimate||'1h', s.category||'General', s.created_at || new Date().toISOString()]);
    });
    (data.parts || []).forEach(p => {
      run('INSERT OR REPLACE INTO parts VALUES (?,?,?,?,?,?)',
        [p.id, p.name, p.category||'', p.unit_price||0, p.stock||0, p.created_at || new Date().toISOString()]);
    });
    (data.technicians || []).forEach(t => {
      run('INSERT OR REPLACE INTO technicians VALUES (?,?,?,?,?,?,?,?)',
        [t.id, t.name, t.phone, t.specialization || '', t.role || 'Junior', t.lorry_id || '', t.created_at || new Date().toISOString(), t.updated_at || new Date().toISOString()]);
    });
    (data.customers || []).forEach(c => {
      run('INSERT OR REPLACE INTO customers VALUES (?,?,?,?,?,?,?)',
        [c.id, c.name, c.phone, c.address || '', c.notes || '', c.created_at || new Date().toISOString(), c.updated_at || new Date().toISOString()]);
    });
    (data.branches || []).forEach(b => {
      run(`INSERT OR REPLACE INTO branches
        (id, name, type, address, phone, last_service_date, last_dp_service_date, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [b.id, b.name, b.type || 'Branch', b.address || '', b.phone || '', b.last_service_date || '',
         b.last_dp_service_date || '', b.created_at || new Date().toISOString(), b.updated_at || new Date().toISOString()]);
    });
    (data.jobs || []).forEach(j => {
      run(`INSERT OR REPLACE INTO jobs
        (id, job_number, customer_id, service_id, lorry_id, service_type, description, technician_id, status, date,
         parts_cost, labor_cost, transport_cost, overhead_percent, profit_percent, created_at, updated_at, branch_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [j.id, j.job_number || j.jobNumber || nextJobNumber(), j.customer_id || j.customerId, j.service_id||'', j.lorry_id||'', j.service_type || j.serviceType,
         j.description || '', j.technician_id || '', j.status || 'Pending', j.date, j.parts_cost||0, j.labor_cost||0, j.transport_cost||0,
         j.overhead_percent||10, j.profit_percent||30, j.created_at || new Date().toISOString(), j.updated_at || new Date().toISOString(),
         j.branch_id || j.branchId || '']);
    });
    (data.invoices || []).forEach(inv => {
      run(`INSERT OR REPLACE INTO invoices
        (id, invoice_number, job_id, customer_id, parts_cost, labor_cost, transport_cost, overhead_percent,
         profit_percent, subtotal, overhead_amount, profit_amount, total, status, finalized, created_at, updated_at, branch_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [inv.id, inv.invoice_number || inv.invoiceNumber, inv.job_id || inv.jobId || null,
         inv.customer_id || inv.customerId, inv.parts_cost||0, inv.labor_cost||0, inv.transport_cost||0,
         inv.overhead_percent||10, inv.profit_percent||30, inv.subtotal||0, inv.overhead_amount||0,
         inv.profit_amount||0, inv.total||0, inv.status||'Unpaid', inv.finalized||0,
         inv.created_at || new Date().toISOString(), inv.updated_at || new Date().toISOString(),
         inv.branch_id || inv.branchId || '']);
    });
    (data.invoice_items || []).forEach(item => {
      run(`INSERT OR REPLACE INTO invoice_items
        (id, invoice_id, description, quantity, unit_price, amount, created_at)
        VALUES (?,?,?,?,?,?,?)`,
        [item.id, item.invoice_id || item.invoiceId, item.description || '', item.quantity || 1,
         item.unit_price ?? item.unitPrice ?? 0, item.amount || 0, item.created_at || new Date().toISOString()]);
    });
    (data.quotations || []).forEach(q => {
      run('INSERT OR REPLACE INTO quotations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [q.id, q.quotation_number, q.customer_id||'', q.job_id||'', q.parts_cost||0, q.labor_cost||0, q.transport_cost||0, q.overhead_percent||10, q.profit_percent||30, q.subtotal||0, q.overhead_amount||0, q.profit_amount||0, q.total||0, q.created_at || new Date().toISOString()]);
    });
    (data.job_parts || []).forEach(jp => {
      run('INSERT OR REPLACE INTO job_parts VALUES (?,?,?,?,?,?)',
        [jp.id, jp.job_id, jp.part_id, jp.quantity||1, jp.unit_price||0, jp.created_at || new Date().toISOString()]);
    });
    (data.job_history || []).forEach(jh => {
      run('INSERT OR REPLACE INTO job_history VALUES (?,?,?,?,?,?)',
        [jh.id, jh.job_id, jh.status, jh.notes||'', jh.updated_by||'', jh.created_at || new Date().toISOString()]);
    });
    (data.bills || []).forEach(b => {
      run(`INSERT OR REPLACE INTO bills
        (id, bill_number, vendor, category, amount, date, description, status, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [b.id, b.bill_number || b.billNumber, b.vendor || '', b.category || 'Other', b.amount || 0,
         b.date, b.description || '', b.status || 'Unpaid', b.created_at || new Date().toISOString()]);
    });
    (data.lorry_logs || []).forEach(log => {
      run(`INSERT OR REPLACE INTO lorry_logs
        (id, lorry_id, date, start_odometer, end_odometer, fuel_liters, fuel_cost, gps_summary, notes, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [log.id, log.lorry_id || log.lorryId, log.date, log.start_odometer ?? log.startOdometer ?? 0,
         log.end_odometer ?? log.endOdometer ?? 0, log.fuel_liters ?? log.fuelLiters ?? 0,
         log.fuel_cost ?? log.fuelCost ?? 0, log.gps_summary ?? log.gpsSummary ?? '',
         log.notes || '', log.created_at || new Date().toISOString()]);
    });
    (data.signed_documents || []).forEach(doc => {
      run('INSERT OR REPLACE INTO signed_documents VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [doc.id, doc.job_id || doc.jobId, doc.customer_id || doc.customerId, doc.document_type || 'job_sheet', doc.filename,
         doc.original_name || doc.originalName || doc.filename, doc.mime_type || 'application/octet-stream',
         doc.file_size || 0, doc.uploaded_by || '', doc.notes || '', doc.created_at || new Date().toISOString()]);
    });
  });
  tx();
}

function resetDemoData() {
  const tx = _db.transaction(() => {
    clearBusinessData();
    seedBusinessData();
  });
  tx();
}

module.exports = {
  init, persist, getDb, all, get, run,
  calculatePricing, nextInvoiceNumber, nextQuotationNumber, nextJobNumber,
  exportAllData, importAllData, resetDemoData,
};
