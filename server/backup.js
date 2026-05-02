/* =========================================================
   CD Engineering — Backup System
   ========================================================= */
const fs = require('fs');
const path = require('path');
const db = require('./db');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ── Create Backup ─────────────────────────────────────────
function createBackup(label) {
  ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = label ? label + '_' : '';
  const filename = `backup_${prefix}${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  const data = db.exportAllData();
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[Backup] Created: ${filename}`);
  return { filename, filepath, size: fs.statSync(filepath).size, createdAt: new Date().toISOString() };
}

// ── List Backups ──────────────────────────────────────────
function listBackups() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const fp = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fp);
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Restore Backup ────────────────────────────────────────
function restoreBackup(filename) {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) throw new Error('Backup file not found');
  const raw = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(raw);
  if (!data.customers || !data.jobs) throw new Error('Invalid backup format');
  db.importAllData(data);
  return { restored: true, filename };
}

// ── Schedule Daily Auto-Backup ────────────────────────────
function scheduleAutoBackup() {
  // Run every 24 hours
  setInterval(() => {
    try {
      createBackup('auto');
      // Keep only last 30 auto-backups
      const backups = listBackups().filter(b => b.filename.startsWith('backup_auto_'));
      if (backups.length > 30) {
        backups.slice(30).forEach(b => {
          try { fs.unlinkSync(path.join(BACKUP_DIR, b.filename)); } catch (e) {}
        });
      }
    } catch (e) {
      console.error('[Backup] Auto-backup failed:', e.message);
    }
  }, 24 * 60 * 60 * 1000);
  console.log('[Backup] Auto-backup scheduled (every 24 hours)');
}

module.exports = { createBackup, listBackups, restoreBackup, scheduleAutoBackup };
