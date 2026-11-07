const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const db = require('../db');
const settings = require('../settings');
const queue = require('../services/queue');
const { dedupe } = require('../services/dedupe');
const ai = require('../services/openai');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: e.message }); });

const EXPORT_COLS = ['id', 'product_id', 'sku', 'name', 'product_url', 'changelog_url', 'version', 'previous_version', 'version_changed_at', 'version_source', 'source_url', 'status', 'last_error', 'notes', 'checked_at', 'created_at', 'updated_at'];
const clean = v => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00:00`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
/** Server-local day boundaries as 'YYYY-MM-DD 00:00:00' strings (works for MySQL DATETIME and SQLite TEXT). */
function dateRange(kind, from, to) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  switch (kind) {
    case 'today': return { from: ymd(today), to: ymd(addDays(today, 1)) };
    case 'yesterday': return { from: ymd(addDays(today, -1)), to: ymd(today) };
    case '7d': return { from: ymd(addDays(today, -6)), to: ymd(addDays(today, 1)) };
    case '30d': return { from: ymd(addDays(today, -29)), to: ymd(addDays(today, 1)) };
    case 'custom': {
      const ok = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
      if (!ok(from) && !ok(to)) return null;
      const f = ok(from) ? new Date(`${from}T00:00:00`) : new Date('2000-01-01T00:00:00');
      const t = ok(to) ? addDays(new Date(`${to}T00:00:00`), 1) : addDays(today, 1);
      return { from: ymd(f), to: ymd(t) };
    }
    default: return null;
  }
}

function buildWhere(f = {}) {
  const w = [], p = [];
  if (f.q) { w.push('(name LIKE ? OR sku LIKE ? OR product_id LIKE ? OR version LIKE ? OR previous_version LIKE ?)'); const l = `%${f.q}%`; p.push(l, l, l, l, l); }
  if (f.status) { w.push('status = ?'); p.push(f.status); }
  if (f.source) { w.push('version_source = ?'); p.push(f.source); }
  // "Version changed" / "Checked" date filters: today | yesterday | 7d | 30d | custom (from/to = YYYY-MM-DD)
  for (const [key, col] of [['changed', 'version_changed_at'], ['checked', 'checked_at']]) {
    const r = dateRange(f[key], f[`${key}_from`], f[`${key}_to`]);
    if (r) { w.push(`${col} >= ? AND ${col} < ?`); p.push(r.from, r.to); }
  }
  if (f.has_previous === '1') w.push("previous_version IS NOT NULL AND previous_version <> ''");
  if (f.has_previous === '0') w.push("(previous_version IS NULL OR previous_version = '')");
  return { sql: w.length ? `WHERE ${w.join(' AND ')}` : '', params: p };
}

/** {ids:[...]} or {all:true, filter:{...}, exclude:[...]} -> list of ids */
async function resolveIds(body) {
  if (body.all) {
    const { sql, params } = buildWhere(body.filter || {});
    const exclude = new Set((body.exclude || []).map(Number));
    return (await db.query(`SELECT id FROM products ${sql}`, params)).map(r => r.id).filter(id => !exclude.has(id));
  }
  return (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean);
}

/* ------------------------------ Products ------------------------------ */
router.get('/products', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(500, Math.max(5, parseInt(req.query.limit, 10) || 25));
  const sortable = { id: 'id', name: 'name', sku: 'sku', product_id: 'product_id', version: 'version', previous_version: 'previous_version', version_changed_at: 'version_changed_at', status: 'status', checked_at: 'checked_at' };
  const sort = sortable[req.query.sort] || 'id';
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
  const { sql, params } = buildWhere(req.query);
  const [{ total }] = await db.query(`SELECT COUNT(*) total FROM products ${sql}`, params);
  const rows = await db.query(`SELECT * FROM products ${sql} ORDER BY ${sort} ${dir} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ rows, total: Number(total), page, limit });
}));

router.post('/products', wrap(async (req, res) => {
  const b = req.body;
  if (!clean(b.name)) return res.status(400).json({ error: 'Name is required' });
  const v = clean(b.version);
  const r = await db.query(
    `INSERT INTO products (product_id, sku, name, product_url, changelog_url, version, previous_version, version_source, status, version_changed_at) VALUES (?,?,?,?,?,?,?,?,?,${v ? 'NOW()' : 'NULL'})`,
    [clean(b.product_id), clean(b.sku), clean(b.name), clean(b.product_url), clean(b.changelog_url), v, clean(b.previous_version), v ? 'manual' : null, v ? 'found' : 'new']);
  if (b.extract) await queue.enqueue([r.insertId], 'auto');
  res.json({ id: r.insertId });
}));

router.put('/products/:id', wrap(async (req, res) => {
  const b = req.body;
  if (!clean(b.name)) return res.status(400).json({ error: 'Name is required' });
  const [old] = await db.query('SELECT version, previous_version FROM products WHERE id=?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const v = clean(b.version), pv = clean(b.previous_version);
  const manual = (v || null) !== (old.version || null) || (pv || null) !== (old.previous_version || null);
  const verChanged = (v || null) !== (old.version || null) && v;
  await db.query(
    `UPDATE products SET ${verChanged ? 'version_changed_at=NOW(), ' : ''}product_id=?, sku=?, name=?, product_url=?, changelog_url=?, version=?, previous_version=?
     ${manual ? ", version_source='manual', status=CASE WHEN ? IS NULL THEN status ELSE 'found' END" : ''} WHERE id=?`,
    [clean(b.product_id), clean(b.sku), clean(b.name), clean(b.product_url), clean(b.changelog_url), v, pv, ...(manual ? [v] : []), req.params.id]);
  if (b.extract) await queue.enqueue([Number(req.params.id)], 'auto');
  res.json({ ok: true });
}));

router.delete('/products/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

router.post('/products/bulk-delete', wrap(async (req, res) => {
  const ids = await resolveIds(req.body);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 1000) deleted += (await db.query('DELETE FROM products WHERE id IN (?)', [ids.slice(i, i + 1000)])).affectedRows;
  res.json({ deleted });
}));

router.post('/products/delete-all', wrap(async (req, res) => {
  if (req.body.confirm !== 'DELETE') return res.status(400).json({ error: 'Confirmation text required' });
  await db.query('DELETE FROM jobs');
  const r = await db.query('DELETE FROM products');
  res.json({ deleted: r.affectedRows });
}));

router.post('/products/extract', wrap(async (req, res) => {
  const type = ['auto', 'changelog', 'ai_version', 'ai_changelog'].includes(req.body.type) ? req.body.type : 'auto';
  res.json(await queue.enqueue(await resolveIds(req.body), type));
}));

/* ------------------------------ CSV export ------------------------------ */
router.post('/products/export', wrap(async (req, res) => {
  const ids = await resolveIds(req.body.all || !req.body.ids ? { ...req.body, all: true } : req.body);
  let rows = [];
  for (let i = 0; i < ids.length; i += 1000) rows.push(...await db.query('SELECT * FROM products WHERE id IN (?) ORDER BY id', [ids.slice(i, i + 1000)]));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  const want = Array.isArray(req.body.columns) ? req.body.columns.filter(c => EXPORT_COLS.includes(c)) : [];
  const columns = want.length ? want : EXPORT_COLS;
  const fname = String(req.body.filename || 'products').replace(/[^\w.-]+/g, '-').slice(0, 80);
  res.setHeader('Content-Disposition', `attachment; filename="${fname}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\ufeff' + stringify(rows, { header: true, columns }));
}));

router.get('/template.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
  res.send(stringify([
    { product_id: '1001', sku: 'WP-ROCKET', name: 'WP Rocket', changelog_url: 'https://wp-rocket.me/changelog/' },
    { product_id: '1002', sku: 'VSCODE', name: 'Visual Studio Code', changelog_url: 'https://github.com/microsoft/vscode/releases' },
    { product_id: '1003', sku: 'NOTEPADPP', name: 'Notepad++', changelog_url: '' },
  ], { header: true, columns: ['product_id', 'sku', 'name', 'changelog_url'] }));
});

/* ------------------------------ CSV import ------------------------------ */
const HEADER_MAP = {
  product_id: ['product_id', 'productid', 'id', 'product id', 'pid', 'item_id'],
  sku: ['sku', 'product_sku', 'item_sku', 'code'],
  name: ['name', 'product_name', 'product', 'title', 'product name', 'item_name'],
  product_url: ['product_url', 'product url', 'page_url', 'link', 'permalink'],
  changelog_url: ['changelog_url', 'changelog', 'changelog url', 'url', 'release_notes', 'release notes url'],
  version: ['version', 'current_version', 'latest_version'],
  previous_version: ['previous_version', 'previous version', 'prev_version', 'old_version'],
};
function mapRow(raw) {
  const lower = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase().replace(/^\ufeff/, ''), v]));
  const out = {};
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    const key = aliases.find(a => a in lower);
    out[field] = key ? clean(lower[key]) : null;
  }
  return out;
}

router.post('/import', upload.single('file'), wrap(async (req, res) => {
  const s = await settings.getAll();
  const text = req.file ? req.file.buffer.toString('utf8') : String(req.body.text || '');
  if (!text.trim()) return res.status(400).json({ error: 'Upload a CSV file or paste CSV text' });

  let records;
  try {
    records = parse(text, { columns: true, bom: true, skip_empty_lines: true, relax_column_count: true, trim: true, delimiter: [',', ';', '\t', '|'] });
  } catch (e) { return res.status(400).json({ error: `CSV parse error: ${e.message}` }); }

  const invalid = [], items = [];
  records.forEach((r, i) => {
    const m = { ...mapRow(r), _row: i + 2 };
    if (!m.name && !m.sku && !m.product_id) invalid.push({ row: i + 2, reason: 'No product_id, sku or name' });
    else { if (!m.name) m.name = m.sku || m.product_id; items.push(m); }
  });

  const method = ['none', 'regex', 'ai'].includes(req.body.dedupe_method) ? req.body.dedupe_method : s.dedupe_method;
  const keys = String(req.body.match_keys || 'product_id,sku,name').split(',').map(k => k.trim()).filter(k => ['product_id', 'sku', 'name'].includes(k));
  const existing = req.body.skip_existing === '0' ? [] : await db.query('SELECT id, product_id, sku, name FROM products');
  const { unique, duplicates } = await dedupe(items, { method, keys, existing, settings: s });

  const batch = crypto.randomUUID();
  for (let i = 0; i < unique.length; i += 500) {
    const rows = unique.slice(i, i + 500).map(u => [u.product_id, u.sku, u.name, u.product_url, u.changelog_url, u.version, u.previous_version, u.version ? 'manual' : null, u.version ? 'found' : 'new', batch]);
    await db.query('INSERT INTO products (product_id, sku, name, product_url, changelog_url, version, previous_version, version_source, status, import_batch) VALUES ?', [rows]);
  }

  let queued = 0;
  if (req.body.extract_after === '1' && unique.length) {
    const ids = (await db.query('SELECT id FROM products WHERE import_batch=?', [batch])).map(r => r.id);
    queued = (await queue.enqueue(ids, 'auto')).queued;
  }

  res.json({
    total_rows: records.length, inserted: unique.length, duplicates_count: duplicates.length, invalid_count: invalid.length, queued, method,
    duplicates: duplicates.map(d => ({ row: d.row, product_id: d.item.product_id, sku: d.item.sku, name: d.item.name, reason: d.reason })),
    invalid,
  });
}));

/* ------------------------------ Jobs ------------------------------ */
router.get('/jobs/stats', wrap(async (req, res) => {
  const st = await queue.stats();
  const [{ total }] = await db.query('SELECT COUNT(*) total FROM products');
  const t = dateRange('today');
  const [{ c }] = await db.query('SELECT COUNT(*) c FROM products WHERE version_changed_at >= ? AND version_changed_at < ?', [t.from, t.to]);
  res.json({ ...st, total_products: Number(total), updated_today: Number(c) });
}));
router.get('/jobs', wrap(async (req, res) => {
  const status = req.query.status;
  const rows = await db.query(
    `SELECT j.*, p.name AS product_name FROM jobs j LEFT JOIN products p ON p.id=j.product_id ${status ? 'WHERE j.status=?' : ''} ORDER BY j.id DESC LIMIT 200`,
    status ? [status] : []);
  res.json({ rows });
}));
router.post('/jobs/run-now', wrap(async (req, res) => res.json(await queue.drain(25000))));
router.post('/jobs/retry-failed', wrap(async (req, res) => {
  const r = await db.query("UPDATE jobs SET status='pending', attempts=0, locked_by=NULL, run_after=NOW() WHERE status='failed'");
  res.json({ retried: r.affectedRows });
}));
router.post('/jobs/clear-finished', wrap(async (req, res) => {
  const r = await db.query("DELETE FROM jobs WHERE status IN ('done','failed')");
  res.json({ deleted: r.affectedRows });
}));
router.post('/jobs/cancel-pending', wrap(async (req, res) => {
  const r = await db.query("DELETE FROM jobs WHERE status='pending'");
  await db.query("UPDATE products SET status='new' WHERE status='queued'");
  res.json({ cancelled: r.affectedRows });
}));

/* ------------------------------ Settings ------------------------------ */
router.get('/system', (req, res) => res.json(db.info()));
router.get('/settings', wrap(async (req, res) => res.json(settings.masked(await settings.getAll()))));
router.put('/settings', wrap(async (req, res) => res.json(settings.masked(await settings.save(req.body)))));
router.post('/settings/test-openai', wrap(async (req, res) => {
  try { res.json({ ok: true, reply: await ai.testConnection(await settings.getAll()) }); }
  catch (e) { res.json({ ok: false, error: e.message }); }
}));

module.exports = router;
