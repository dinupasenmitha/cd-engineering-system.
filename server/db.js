/* =========================================================
   CD Engineering — Database Layer (sql.js / SQLite)
   ========================================================= */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'cd_engineering.db');
let _db = null;

// ── Ensure data directory exists ──────────────────────────
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ── Initialize Database ───────────────────────────────────
async function init() {
  const SQL = await initSqlJs();
  ensureDir(path.dirname(DB_PATH));

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');

  createSchema();

  // Check if seed data is needed
  const userCount = _db.exec('SELECT COUNT(*) as c FROM users')[0].values[0][0];
  if (userCount === 0) {
    seedData();
  }

  persist();
  return _db;
}

// ── Save database to disk ─────────────────────────────────
function persist() {
  if (!_db) return;
  const data = _db.export();
  const buffer = Buffer.from(data);
  ensureDir(path.dirname(DB_PATH));
  fs.writeFileSync(DB_PATH, buffer);
}

// ── Schema ────────────────────────────────────────────────
function createSchema() {
  _db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','staff')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS lorries (
    id TEXT PRIMARY KEY,
    lorry_number TEXT NOT NULL,
    assigned_area TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Maintenance','Inactive')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    standard_price REAL DEFAULT 0,
    duration_estimate TEXT DEFAULT '1h',
    category TEXT DEFAULT 'General',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Migration: Add category column if it doesn't exist
  try {
    _db.run('SELECT category FROM services LIMIT 1');
  } catch (e) {
    _db.run('ALTER TABLE services ADD COLUMN category TEXT DEFAULT \'General\'');
  }

  _db.run(`CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    unit_price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    specialization TEXT DEFAULT '',
    role TEXT DEFAULT 'Junior' CHECK(role IN ('Senior','Junior')),
    lorry_id TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
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

  _db.run(`CREATE TABLE IF NOT EXISTS invoices (
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

  _db.run(`CREATE TABLE IF NOT EXISTS quotations (
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
  _db.run('INSERT INTO users VALUES (?,?,?,?,?,datetime("now"))', [uuidv4(), 'admin', adminHash, 'Administrator', 'admin']);
  _db.run('INSERT INTO users VALUES (?,?,?,?,?,datetime("now"))', [uuidv4(), 'staff', staffHash, 'Staff User', 'staff']);

  // Lorries
  const lA = uuidv4(), lB = uuidv4();
  _db.run('INSERT INTO lorries VALUES (?,?,?,?,datetime("now"))', [lA, 'WP-LM-1234', 'Colombo', 'Active']);
  _db.run('INSERT INTO lorries VALUES (?,?,?,?,datetime("now"))', [lB, 'WP-LK-9876', 'Kandy', 'Active']);

  // Services
  const sInstall = uuidv4(), sRepair = uuidv4(), sRefill = uuidv4(), sClean = uuidv4();
  _db.run('INSERT INTO services VALUES (?,?,?,?,?,?,datetime("now"))', [sInstall, 'AC Installation', 'Standard split AC installation', 8000, '3h', 'Installation']);
  _db.run('INSERT INTO services VALUES (?,?,?,?,?,?,datetime("now"))', [sRepair, 'AC Repair', 'Troubleshooting and repair', 5000, '2h', 'Repair']);
  _db.run('INSERT INTO services VALUES (?,?,?,?,?,?,datetime("now"))', [sRefill, 'AC Gas Refill', 'R410A / R32 gas refill', 3000, '1h', 'Gas Refill']);
  _db.run('INSERT INTO services VALUES (?,?,?,?,?,?,datetime("now"))', [sClean, 'Full Service Cleaning', 'Deep cleaning of indoor and outdoor units', 3500, '2h', 'Maintenance']);

  // Parts
  const pCompressor = uuidv4(), pFilter = uuidv4(), pPipe = uuidv4();
  _db.run('INSERT INTO parts VALUES (?,?,?,?,?,datetime("now"))', [pCompressor, 'Inverter Compressor', 'Compressor', 45000, 10]);
  _db.run('INSERT INTO parts VALUES (?,?,?,?,?,datetime("now"))', [pFilter, 'Air Filter', 'Filter', 1500, 50]);
  _db.run('INSERT INTO parts VALUES (?,?,?,?,?,datetime("now"))', [pPipe, 'Copper Piping (1m)', 'Pipe', 2000, 100]);

  // Technicians
  const tK = uuidv4(), tN = uuidv4(), tR = uuidv4();
  _db.run('INSERT INTO technicians VALUES (?,?,?,?,?,?,?,?)', [tK, 'Kamal Perera', '0771234501', 'Installation', 'Senior', lA, '2025-06-15T08:00:00Z', '2025-06-15T08:00:00Z']);
  _db.run('INSERT INTO technicians VALUES (?,?,?,?,?,?,?,?)', [tN, 'Nuwan Silva', '0771234502', 'Repair', 'Junior', lA, '2025-07-01T08:00:00Z', '2025-07-01T08:00:00Z']);
  _db.run('INSERT INTO technicians VALUES (?,?,?,?,?,?,?,?)', [tR, 'Ranjith Fernando', '0771234503', 'Gas Refill', 'Senior', lB, '2025-08-10T08:00:00Z', '2025-08-10T08:00:00Z']);

  // Customers
  const cS = uuidv4(), cP = uuidv4(), cNi = uuidv4(), cD = uuidv4(), cM = uuidv4();
  _db.run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cS, 'Samantha Jayawardena', '0771234567', '45 Galle Road, Colombo 03', 'VIP customer — 3 office units', '2025-09-01T08:00:00Z', '2025-09-01T08:00:00Z']);
  _db.run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cP, 'Priyantha Kumara', '0779876543', '12 Kandy Road, Kadawatha', '', '2025-09-15T08:00:00Z', '2025-09-15T08:00:00Z']);
  _db.run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cNi, 'Nishantha Bandara', '0775551234', '78 Main Street, Negombo', 'Prefers morning appointments', '2025-10-05T08:00:00Z', '2025-10-05T08:00:00Z']);
  _db.run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cD, 'Dilani Weerasinghe', '0773334567', '23 Temple Road, Nugegoda', '', '2025-11-10T08:00:00Z', '2025-11-10T08:00:00Z']);
  _db.run('INSERT INTO customers VALUES (?,?,?,?,?,?,?)', [cM, 'Mahesh Rathnayake', '0776667890', '56 Lake Road, Kurunegala', 'Service contract', '2025-12-01T08:00:00Z', '2025-12-01T08:00:00Z']);

  // Jobs
  const jobs = [
    [uuidv4(), cS, sInstall, lA, 'Installation', '2-ton split AC — main office', tK, 'Completed', '2026-01-10', 45000, 8000, 2000, 10, 30, '2026-01-08T08:00:00Z'],
    [uuidv4(), cP, sRepair, lA, 'Repair', 'Compressor not working', tN, 'Completed', '2026-01-22', 12000, 5000, 1500, 10, 30, '2026-01-20T08:00:00Z'],
    [uuidv4(), cNi, sClean, lB, 'Service', 'Annual maintenance — 2 units', tN, 'Completed', '2026-02-05', 3000, 4000, 1500, 10, 30, '2026-02-03T08:00:00Z'],
    [uuidv4(), cS, sRefill, lA, 'Gas Refill', 'R410A gas refill — conference room', tR, 'Completed', '2026-02-18', 8000, 3000, 1000, 10, 30, '2026-02-16T08:00:00Z'],
    [uuidv4(), cD, sInstall, lB, 'Installation', '1.5-ton inverter AC — bedroom', tK, 'Completed', '2026-03-10', 38000, 7000, 2500, 10, 30, '2026-03-08T08:00:00Z'],
    [uuidv4(), cM, sRepair, lA, 'Repair', 'Water leaking from indoor unit', tN, 'In Progress', '2026-04-25', 5000, 4000, 2000, 10, 30, '2026-04-23T08:00:00Z'],
    [uuidv4(), cNi, sClean, lB, 'Service', 'Full cleaning and filter replacement', tR, 'Pending', '2026-05-02', 2500, 3500, 1500, 10, 30, '2026-04-28T08:00:00Z'],
    [uuidv4(), cP, sInstall, lA, 'Installation', '3-ton cassette AC — shop floor', tK, 'Pending', '2026-05-05', 85000, 15000, 3000, 10, 30, '2026-04-30T08:00:00Z'],
  ];
  jobs.forEach(j => {
    _db.run('INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime("now"))', j);
  });

  // Invoices for completed jobs (first 5)
  for (let i = 0; i < 5; i++) {
    const j = jobs[i];
    const p = calculatePricing(j[9], j[10], j[11], j[12], j[13]);
    const invNum = 'INV-' + String(i + 1).padStart(4, '0');
    const invDate = new Date(new Date(j[14]).getTime() + 2 * 86400000).toISOString();
    _db.run('INSERT INTO invoices VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime("now"))',
      [uuidv4(), invNum, j[0], j[1], j[9], j[10], j[11], j[12], j[13],
       p.subtotal, p.overheadAmount, p.profitAmount, p.total,
       i < 4 ? 'Paid' : 'Unpaid', i < 4 ? 1 : 0, invDate]);
  }
}

// ── Query Helpers ─────────────────────────────────────────
function all(sql, params) {
  const stmt = _db.prepare(sql);
  if (params) stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function get(sql, params) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params) {
  if (params) _db.run(sql, params);
  else _db.run(sql);
  persist();
}

function getDb() { return _db; }

// ── Next Invoice/Quotation Number ─────────────────────────
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

// ── Export for backup ─────────────────────────────────────
function exportAllData() {
  return {
    lorries: all('SELECT * FROM lorries'),
    services: all('SELECT * FROM services'),
    parts: all('SELECT * FROM parts'),
    customers: all('SELECT * FROM customers'),
    technicians: all('SELECT * FROM technicians'),
    jobs: all('SELECT * FROM jobs'),
    invoices: all('SELECT * FROM invoices'),
    quotations: all('SELECT * FROM quotations'),
    exportedAt: new Date().toISOString(),
  };
}

function importAllData(data) {
  _db.run('DELETE FROM invoices');
  _db.run('DELETE FROM quotations');
  _db.run('DELETE FROM jobs');
  _db.run('DELETE FROM customers');
  _db.run('DELETE FROM technicians');
  _db.run('DELETE FROM lorries');
  _db.run('DELETE FROM services');
  _db.run('DELETE FROM parts');

  (data.lorries || []).forEach(l => {
    _db.run('INSERT OR REPLACE INTO lorries VALUES (?,?,?,?,?)',
      [l.id, l.lorry_number, l.assigned_area||'', l.status||'Active', l.created_at || new Date().toISOString()]);
  });
  (data.services || []).forEach(s => {
    _db.run('INSERT OR REPLACE INTO services VALUES (?,?,?,?,?,?,?)',
      [s.id, s.name, s.description||'', s.standard_price||0, s.duration_estimate||'1h', s.category||'General', s.created_at || new Date().toISOString()]);
  });
  (data.parts || []).forEach(p => {
    _db.run('INSERT OR REPLACE INTO parts VALUES (?,?,?,?,?,?)',
      [p.id, p.name, p.category||'', p.unit_price||0, p.stock||0, p.created_at || new Date().toISOString()]);
  });
  (data.technicians || []).forEach(t => {
    _db.run('INSERT OR REPLACE INTO technicians VALUES (?,?,?,?,?,?,?,?)',
      [t.id, t.name, t.phone, t.specialization || '', t.role || 'Junior', t.lorry_id || '', t.created_at || new Date().toISOString(), t.updated_at || new Date().toISOString()]);
  });
  (data.customers || []).forEach(c => {
    _db.run('INSERT OR REPLACE INTO customers VALUES (?,?,?,?,?,?,?)',
      [c.id, c.name, c.phone, c.address || '', c.notes || '', c.created_at || new Date().toISOString(), c.updated_at || new Date().toISOString()]);
  });
  (data.jobs || []).forEach(j => {
    _db.run('INSERT OR REPLACE INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [j.id, j.customer_id, j.service_id||'', j.lorry_id||'', j.service_type, j.description || '', j.technician_id || '', j.status, j.date, j.parts_cost||0, j.labor_cost||0, j.transport_cost||0, j.overhead_percent||10, j.profit_percent||30, j.created_at || new Date().toISOString(), j.updated_at || new Date().toISOString()]);
  });
  (data.invoices || []).forEach(inv => {
    _db.run('INSERT OR REPLACE INTO invoices VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [inv.id, inv.invoice_number, inv.job_id||'', inv.customer_id, inv.parts_cost||0, inv.labor_cost||0, inv.transport_cost||0, inv.overhead_percent||10, inv.profit_percent||30, inv.subtotal||0, inv.overhead_amount||0, inv.profit_amount||0, inv.total||0, inv.status||'Unpaid', inv.finalized||0, inv.created_at || new Date().toISOString(), inv.updated_at || new Date().toISOString()]);
  });
  (data.quotations || []).forEach(q => {
    _db.run('INSERT OR REPLACE INTO quotations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [q.id, q.quotation_number, q.customer_id||'', q.job_id||'', q.parts_cost||0, q.labor_cost||0, q.transport_cost||0, q.overhead_percent||10, q.profit_percent||30, q.subtotal||0, q.overhead_amount||0, q.profit_amount||0, q.total||0, q.created_at || new Date().toISOString()]);
  });

  persist();
}

module.exports = {
  init, persist, getDb, all, get, run,
  calculatePricing, nextInvoiceNumber, nextQuotationNumber,
  exportAllData, importAllData,
};
