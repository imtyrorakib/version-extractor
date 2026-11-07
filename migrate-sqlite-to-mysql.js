/** Copy all data from the SQLite file into MySQL: `npm run sqlite-to-mysql` (MySQL creds in .env). */
require('dotenv').config();
const fs = require('fs');
const { resolveSqlitePath } = require('./src/db');

(async () => {
  const file = resolveSqlitePath();
  if (!fs.existsSync(file)) throw new Error(`SQLite file not found: ${file}`);
  const { DatabaseSync } = require('node:sqlite');
  const src = new DatabaseSync(file, { readOnly: true });

  process.env.DB_CLIENT = 'mysql';
  const db = require('./src/db');
  await db.migrate();

  const srcCols = src.prepare('PRAGMA table_info(products)').all().map(c => c.name);
  const products = src.prepare('SELECT * FROM products').all().map(r => ({ ...r }));
  const settings = src.prepare('SELECT * FROM settings').all().map(r => ({ ...r }));
  const cols = ['id', 'product_id', 'sku', 'name', 'changelog_url', 'version', 'previous_version', 'version_source', 'source_url', 'status', 'last_error', 'notes', 'import_batch', 'checked_at', 'created_at']
    .filter(c => srcCols.includes(c));
  for (let i = 0; i < products.length; i += 500) {
    const rows = products.slice(i, i + 500).map(p => cols.map(c => (c === 'status' && ['queued', 'processing'].includes(p.status) ? 'new' : p[c])));
    await db.query(`REPLACE INTO products (${cols.join(',')}) VALUES ?`, [rows]);
  }
  for (const s of settings) await db.query('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [s.k, s.v]);
  console.log(`Copied ${products.length} products and ${settings.length} settings from ${file} to MySQL.`);
  process.exit(0);
})().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
