/**
 * Database layer: SQLite by default, MySQL automatically when configured and reachable.
 *   DB_CLIENT=auto (default) | mysql | sqlite
 * SQLite file: SQLITE_PATH, else <Desktop>/version-extractor.sqlite, else ./data/version-extractor.sqlite
 * All app SQL is MySQL-style; it is translated for SQLite in translate().
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

let client = null;
let mysqlPool = null;
let sqlite = null;
let sqlitePath = null;

function mysqlConfigured() {
  return Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER));
}

function resolveSqlitePath() {
  if (process.env.SQLITE_PATH) return path.resolve(process.env.SQLITE_PATH);
  const file = 'version-extractor.sqlite';
  const candidates = [];
  if (process.env.OneDrive) candidates.push(path.join(process.env.OneDrive, 'Desktop'));
  if (process.env.USERPROFILE) candidates.push(path.join(process.env.USERPROFILE, 'Desktop'));
  candidates.push(path.join(os.homedir(), 'Desktop'));
  const desktop = candidates.find(d => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });
  return desktop ? path.join(desktop, file) : path.join(__dirname, '..', 'data', file);
}

function openSqliteDriver(file) {
  try {
    process.removeAllListeners('warning');
    process.on('warning', w => { if (w.name !== 'ExperimentalWarning') console.warn(w); });
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(file);
    return {
      name: 'node:sqlite',
      exec: s => db.exec(s),
      all: (s, p) => db.prepare(s).all(...p).map(r => ({ ...r })),
      run: (s, p) => db.prepare(s).run(...p),
    };
  } catch (e) {
    try {
      const Better = require('better-sqlite3');
      const db = new Better(file);
      return { name: 'better-sqlite3', exec: s => db.exec(s), all: (s, p) => db.prepare(s).all(...p), run: (s, p) => db.prepare(s).run(...p) };
    } catch {
      throw new Error(`SQLite unavailable (${e.message}). Use Node.js 22.13+ or run: npm install better-sqlite3`);
    }
  }
}

async function init() {
  if (client) return client;
  const want = (process.env.DB_CLIENT || 'auto').toLowerCase();

  if (want === 'mysql' || (want === 'auto' && mysqlConfigured())) {
    try {
      const mysql = require('mysql2/promise');
      const common = { waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4', dateStrings: true };
      mysqlPool = process.env.DATABASE_URL
        ? mysql.createPool({ uri: process.env.DATABASE_URL, ...common })
        : mysql.createPool({
            host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ...common,
          });
      await mysqlPool.query('SELECT 1');
      client = 'mysql';
      console.log(`[db] Using MySQL (${process.env.DB_HOST || 'DATABASE_URL'}/${process.env.DB_NAME || ''})`);
      return client;
    } catch (e) {
      if (want === 'mysql') throw new Error(`MySQL connection failed: ${e.message}`);
      console.warn(`[db] MySQL configured but not reachable (${e.message}) -> falling back to SQLite`);
      try { await mysqlPool?.end(); } catch { /* ignore */ }
      mysqlPool = null;
    }
  }

  sqlitePath = resolveSqlitePath();
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  sqlite = openSqliteDriver(sqlitePath);
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 10000;');
  client = 'sqlite';
  console.log(`[db] Using SQLite (${sqlite.name}) file: ${sqlitePath}`);
  return client;
}

function translate(sql, params) {
  const out = [];
  let i = 0;
  sql = sql.replace(/\?/g, () => {
    const p = params[i++];
    if (Array.isArray(p)) {
      if (Array.isArray(p[0])) { p.forEach(row => out.push(...row)); return p.map(row => `(${row.map(() => '?').join(',')})`).join(','); }
      out.push(...p); return p.map(() => '?').join(',') || 'NULL';
    }
    out.push(p === undefined ? null : typeof p === 'boolean' ? Number(p) : p);
    return '?';
  });
  sql = sql
    .replace(/NOW\(\)\s*-\s*INTERVAL\s+(\d+)\s+MINUTE/gi, "datetime('now','localtime','-$1 minutes')")
    .replace(/NOW\(\)\s*\+\s*INTERVAL\s+\?\s+SECOND/gi, "datetime('now','localtime','+' || ? || ' seconds')")
    .replace(/NOW\(\)/gi, "datetime('now','localtime')")
    .replace(/^\s*INSERT IGNORE/i, 'INSERT OR IGNORE')
    .replace(/ON DUPLICATE KEY UPDATE\s+(\w+)\s*=\s*VALUES\(\1\)/gi, 'ON CONFLICT(k) DO UPDATE SET $1 = excluded.$1');
  return { sql, params: out };
}

async function query(sql, params = []) {
  if (!client) await init();
  if (client === 'mysql') {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  }
  const t = translate(sql, params);
  if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(t.sql) || /\bRETURNING\b/i.test(t.sql)) return sqlite.all(t.sql, t.params);
  const r = sqlite.run(t.sql, t.params);
  return { affectedRows: Number(r.changes), insertId: Number(r.lastInsertRowid) };
}

/** Adds columns introduced in newer versions to existing databases. */
async function ensureColumns() {
  const wanted = { products: {
    previous_version: client === 'mysql' ? 'VARCHAR(100) NULL' : 'TEXT',
    product_url: client === 'mysql' ? 'TEXT NULL' : 'TEXT',
    version_changed_at: client === 'mysql' ? 'DATETIME NULL' : 'TEXT',
  } };
  for (const [table, cols] of Object.entries(wanted)) {
    const existing = client === 'mysql'
      ? (await query('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table])).map(r => r.name)
      : (await query(`PRAGMA table_info(${table})`)).map(r => r.name);
    for (const [col, type] of Object.entries(cols)) {
      if (!existing.includes(col)) {
        await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
        console.log(`[db] added column ${table}.${col}`);
      }
    }
  }
}

async function migrate() {
  await init();
  if (client === 'mysql') {
    await query(`CREATE TABLE IF NOT EXISTS products (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(191) NULL, sku VARCHAR(191) NULL, name VARCHAR(500) NOT NULL DEFAULT '',
      changelog_url TEXT NULL, version VARCHAR(100) NULL, previous_version VARCHAR(100) NULL,
      version_source VARCHAR(20) NULL, source_url TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'new', last_error TEXT NULL, notes TEXT NULL, import_batch VARCHAR(40) NULL,
      checked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sku (sku), INDEX idx_pid (product_id), INDEX idx_status (status), INDEX idx_batch (import_batch)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await query(`CREATE TABLE IF NOT EXISTS jobs (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NOT NULL, type VARCHAR(20) NOT NULL, priority INT NOT NULL DEFAULT 10, payload TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, max_attempts INT NOT NULL DEFAULT 2,
      last_error TEXT NULL, locked_by VARCHAR(64) NULL, locked_at DATETIME NULL,
      run_after DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pick (status, priority, id), INDEX idx_lock (locked_by), INDEX idx_prod (product_id),
      CONSTRAINT fk_jobs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await query(`CREATE TABLE IF NOT EXISTS settings (k VARCHAR(64) PRIMARY KEY, v TEXT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await query(`CREATE TABLE IF NOT EXISTS sitemap_urls (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      url_hash CHAR(40) NOT NULL, url TEXT NOT NULL, sitemap_url TEXT NULL, slug VARCHAR(500) NULL, name VARCHAR(500) NOT NULL DEFAULT '',
      has_number TINYINT NOT NULL DEFAULT 0, has_special TINYINT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'new', product_ref INT UNSIGNED NULL, lastmod VARCHAR(40) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_url (url_hash), INDEX idx_s_status (status), INDEX idx_s_num (has_number), INDEX idx_s_spec (has_special)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    return ensureColumns();
  }

  const NOW = "(datetime('now','localtime'))";
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT, sku TEXT, name TEXT NOT NULL DEFAULT '', changelog_url TEXT, version TEXT, previous_version TEXT,
      version_source TEXT, source_url TEXT, status TEXT NOT NULL DEFAULT 'new', last_error TEXT, notes TEXT,
      import_batch TEXT, checked_at TEXT,
      created_at TEXT NOT NULL DEFAULT ${NOW}, updated_at TEXT NOT NULL DEFAULT ${NOW});
    CREATE INDEX IF NOT EXISTS idx_p_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_p_pid ON products(product_id);
    CREATE INDEX IF NOT EXISTS idx_p_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_p_batch ON products(import_batch);
    CREATE TRIGGER IF NOT EXISTS trg_products_updated AFTER UPDATE ON products
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN UPDATE products SET updated_at = ${NOW} WHERE id = NEW.id; END;

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 10, payload TEXT,
      status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 2,
      last_error TEXT, locked_by TEXT, locked_at TEXT,
      run_after TEXT NOT NULL DEFAULT ${NOW},
      created_at TEXT NOT NULL DEFAULT ${NOW}, updated_at TEXT NOT NULL DEFAULT ${NOW});
    CREATE INDEX IF NOT EXISTS idx_j_pick ON jobs(status, priority, id);
    CREATE INDEX IF NOT EXISTS idx_j_lock ON jobs(locked_by);
    CREATE INDEX IF NOT EXISTS idx_j_prod ON jobs(product_id);
    CREATE TRIGGER IF NOT EXISTS trg_jobs_updated AFTER UPDATE ON jobs
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN UPDATE jobs SET updated_at = ${NOW} WHERE id = NEW.id; END;

    CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT);

    CREATE TABLE IF NOT EXISTS sitemap_urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_hash TEXT NOT NULL UNIQUE, url TEXT NOT NULL, sitemap_url TEXT, slug TEXT, name TEXT NOT NULL DEFAULT '',
      has_number INTEGER NOT NULL DEFAULT 0, has_special INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new', product_ref INTEGER, lastmod TEXT,
      created_at TEXT NOT NULL DEFAULT ${NOW}, updated_at TEXT NOT NULL DEFAULT ${NOW});
    CREATE INDEX IF NOT EXISTS idx_s_status ON sitemap_urls(status);
    CREATE INDEX IF NOT EXISTS idx_s_num ON sitemap_urls(has_number);
    CREATE INDEX IF NOT EXISTS idx_s_spec ON sitemap_urls(has_special);
  `);
  return ensureColumns();
}

function info() {
  return { client, sqlite_path: client === 'sqlite' ? sqlitePath : null, driver: client === 'sqlite' ? sqlite.name : 'mysql2', mysql_configured: mysqlConfigured() };
}

module.exports = { init, query, migrate, info, resolveSqlitePath, get client() { return client; } };
