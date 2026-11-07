const express = require('express');
const crypto = require('crypto');
const { stringify } = require('csv-stringify/sync');
const db = require('../db');
const settings = require('../settings');
const queue = require('../services/queue');
const ai = require('../services/openai');
const { dedupe } = require('../services/dedupe');
const sm = require('../services/sitemap');

const router = express.Router();
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(e.status || 500).json({ error: e.message }); });
const bad = msg => Object.assign(new Error(msg), { status: 400 });

function buildWhere(f = {}) {
  const w = [], p = [];
  if (f.q) { w.push('(name LIKE ? OR url LIKE ?)'); p.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.has_number === '1' || f.has_number === '0') { w.push('has_number = ?'); p.push(Number(f.has_number)); }
  if (f.has_special === '1' || f.has_special === '0') { w.push('has_special = ?'); p.push(Number(f.has_special)); }
  if (f.clean === '1') w.push('has_number = 0 AND has_special = 0');
  if (f.status) { w.push('status = ?'); p.push(f.status); }
  if (f.sitemap) { w.push('sitemap_url = ?'); p.push(f.sitemap); }
  return { sql: w.length ? `WHERE ${w.join(' AND ')}` : '', params: p };
}

async function resolveIds(body) {
  if (body.all) {
    const { sql, params } = buildWhere(body.filter || {});
    const exclude = new Set((body.exclude || []).map(Number));
    return (await db.query(`SELECT id FROM sitemap_urls ${sql} ORDER BY id`, params)).map(r => r.id).filter(id => !exclude.has(id));
  }
  return (Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Boolean);
}

async function rowsFor(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 1000) out.push(...await db.query('SELECT * FROM sitemap_urls WHERE id IN (?) ORDER BY id', [ids.slice(i, i + 1000)]));
  return out;
}

async function setName(id, name) {
  name = sm.tidy(name);
  await db.query('UPDATE sitemap_urls SET name=?, has_number=?, has_special=? WHERE id=?', [name, Number(sm.hasNumber(name)), Number(sm.hasSpecial(name)), id]);
}

/* ------------------------------------------------------------- fetch sitemap */
router.post('/fetch', wrap(async (req, res) => {
  const b = req.body || {};
  const url = String(b.url || '').trim();
  const text = typeof b.text === 'string' ? b.text : '';
  const useText = b.mode === 'text' || (!url && text.trim());
  if (useText && !text.trim()) throw bad('Paste some text that contains URLs');
  if (!useText && !/^https?:\/\//i.test(url)) throw bad('Enter a valid sitemap URL starting with http:// or https://');
  let inc = null, exc = null;
  try { if (b.include) inc = new RegExp(b.include, 'i'); if (b.exclude) exc = new RegExp(b.exclude, 'i'); }
  catch { throw bad('Invalid include / exclude pattern (regex)'); }

  const s = await settings.getAll();
  const maxUrls = Math.min(200000, Math.max(1, Number(b.max_urls) || 50000));
  const crawlOpts = { maxUrls, childFilter: b.child_filter || '', followSitemaps: b.follow_sitemaps !== false && b.follow_sitemaps !== '0' };
  const result = useText ? await sm.fromText(text, s, crawlOpts) : await sm.crawl(url, s, crawlOpts);

  const nameOpts = { stripTrailingId: b.strip_trailing_id !== false && b.strip_trailing_id !== '0', removeWords: b.remove_words || '' };
  let filteredOut = 0;
  const rows = [];
  for (const u of result.urls) {
    if ((inc && !inc.test(u.url)) || (exc && exc.test(u.url))) { filteredOut++; continue; }
    const slug = sm.slugOf(u.url, b.name_from || 'last');
    const name = sm.tidy(sm.prettify(slug, nameOpts)) || slug;
    rows.push([sm.hash(u.url), u.url, u.sitemap, String(slug).slice(0, 500), name.slice(0, 500), Number(sm.hasNumber(name)), Number(sm.hasSpecial(name)), u.lastmod]);
  }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const r = await db.query('INSERT IGNORE INTO sitemap_urls (url_hash, url, sitemap_url, slug, name, has_number, has_special, lastmod) VALUES ?', [rows.slice(i, i + 500)]);
    inserted += r.affectedRows;
  }
  res.json({
    mode: useText ? 'text' : 'url', from_text: result.from_text || 0, sitemap_links: result.sitemap_links || 0,
    found: result.urls.length, inserted, already_present: rows.length - inserted, filtered_out: filteredOut,
    sitemaps: result.sitemaps, errors: result.errors, truncated: result.truncated,
  });
}));

/* ------------------------------------------------------------- list / stats */
router.get('/urls', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(500, Math.max(5, parseInt(req.query.limit, 10) || 25));
  const sortable = { id: 'id', name: 'name', url: 'url', status: 'status', lastmod: 'lastmod' };
  const sort = sortable[req.query.sort] || 'id';
  const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';
  const { sql, params } = buildWhere(req.query);
  const [{ total }] = await db.query(`SELECT COUNT(*) total FROM sitemap_urls ${sql}`, params);
  const rows = await db.query(`SELECT * FROM sitemap_urls ${sql} ORDER BY ${sort} ${dir} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ rows, total: Number(total), page, limit });
}));

router.get('/stats', wrap(async (req, res) => {
  const [r] = await db.query(`SELECT COUNT(*) total,
      SUM(CASE WHEN has_number=1 THEN 1 ELSE 0 END) with_number,
      SUM(CASE WHEN has_special=1 THEN 1 ELSE 0 END) with_special,
      SUM(CASE WHEN has_number=0 AND has_special=0 THEN 1 ELSE 0 END) clean,
      SUM(CASE WHEN status='imported' THEN 1 ELSE 0 END) imported,
      SUM(CASE WHEN status='skipped' THEN 1 ELSE 0 END) skipped
    FROM sitemap_urls`);
  const sitemaps = await db.query('SELECT sitemap_url, COUNT(*) c FROM sitemap_urls GROUP BY sitemap_url ORDER BY c DESC LIMIT 200');
  res.json({ ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v || 0)])), sitemaps });
}));

/* ------------------------------------------------------------- single row */
router.put('/urls/:id', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw bad('Name is required');
  await setName(Number(req.params.id), name);
  res.json({ ok: true });
}));
router.delete('/urls/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM sitemap_urls WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

/* ------------------------------------------------------------- preview (name rules) */
router.post('/preview-name', wrap(async (req, res) => {
  const b = req.body || {};
  const slug = sm.slugOf(String(b.url || ''), b.name_from || 'last');
  const name = sm.tidy(sm.prettify(slug, { stripTrailingId: b.strip_trailing_id !== false, removeWords: b.remove_words || '' }));
  res.json({ slug, name, has_number: sm.hasNumber(name), has_special: sm.hasSpecial(name) });
}));

/* ------------------------------------------------------------- bulk actions */
router.post('/bulk', wrap(async (req, res) => {
  const b = req.body || {};
  const ids = await resolveIds(b);
  if (!ids.length) throw bad('Nothing selected');
  const action = b.action;

  if (action === 'delete') {
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 1000) deleted += (await db.query('DELETE FROM sitemap_urls WHERE id IN (?)', [ids.slice(i, i + 1000)])).affectedRows;
    return res.json({ affected: deleted, message: `Deleted ${deleted} URL(s)` });
  }

  if (action === 'reset_status') {
    let n = 0;
    for (let i = 0; i < ids.length; i += 1000) n += (await db.query("UPDATE sitemap_urls SET status='new', product_ref=NULL WHERE id IN (?)", [ids.slice(i, i + 1000)])).affectedRows;
    return res.json({ affected: n, message: `Reset ${n} URL(s) to "new"` });
  }

  if (action === 'regenerate') {
    const opts = { stripTrailingId: b.arg?.strip_trailing_id !== false, removeWords: b.arg?.remove_words || '' };
    let n = 0;
    for (const r of await rowsFor(ids)) {
      const name = sm.tidy(sm.prettify(sm.slugOf(r.url, b.arg?.name_from || 'last'), opts));
      if (name && name !== r.name) { await setName(r.id, name); n++; }
    }
    return res.json({ affected: n, message: `Regenerated ${n} name(s) from URL` });
  }

  if (sm.TRANSFORMS[action]) {
    let n = 0, emptied = 0;
    for (const r of await rowsFor(ids)) {
      const name = sm.tidy(sm.TRANSFORMS[action](r.name, b.arg));
      if (!name) { emptied++; continue; }                     // never leave a blank name
      if (name !== r.name) { await setName(r.id, name); n++; }
    }
    return res.json({ affected: n, message: `Updated ${n} name(s)${emptied ? ` · ${emptied} skipped (would become empty)` : ''}` });
  }

  if (action === 'ai_beautify') {
    const s = await settings.getAll();
    const rows = await rowsFor(ids.slice(0, 2000));
    const names = await ai.beautifyNames(rows, s);
    for (const [id, name] of names) await setName(id, name);
    return res.json({ affected: names.size, message: `AI renamed ${names.size} URL(s)${ids.length > 2000 ? ' (first 2000 only — run again for the rest)' : ''}` });
  }

  if (action === 'import') {
    const s = await settings.getAll();
    const rows = (await rowsFor(ids)).filter(r => r.status !== 'imported');
    const items = rows.map(r => ({ _id: r.id, name: r.name, product_url: r.url }));
    let unique = items, duplicates = [];
    if (b.arg?.skip_duplicates !== false) {
      const existing = await db.query('SELECT id, product_id, sku, name FROM products');
      ({ unique, duplicates } = await dedupe(items, { method: b.arg?.dedupe_method === 'ai' ? 'ai' : 'regex', keys: ['name'], existing, settings: s }));
    }
    const batch = crypto.randomUUID();
    const newIds = [];
    for (const it of unique) {
      const r = await db.query("INSERT INTO products (name, product_url, status, import_batch, notes) VALUES (?,?,?,?,?)", [it.name, it.product_url, 'new', batch, 'from sitemap']);
      newIds.push(r.insertId);
      await db.query("UPDATE sitemap_urls SET status='imported', product_ref=? WHERE id=?", [r.insertId, it._id]);
    }
    for (const d of duplicates) await db.query("UPDATE sitemap_urls SET status='skipped' WHERE id=?", [d.item._id]);
    let queued = 0;
    if (b.arg?.extract_after && newIds.length) queued = (await queue.enqueue(newIds, 'auto')).queued;
    return res.json({
      affected: unique.length, duplicates: duplicates.length, queued,
      message: `Imported ${unique.length} product(s)${duplicates.length ? ` · ${duplicates.length} duplicate(s) skipped` : ''}${queued ? ` · ${queued} queued for extraction` : ''}`,
    });
  }

  throw bad(`Unknown action: ${action}`);
}));

/* ------------------------------------------------------------- export */
router.post('/export', wrap(async (req, res) => {
  const ids = await resolveIds(req.body.ids ? req.body : { ...req.body, all: true });
  const rows = await rowsFor(ids);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sitemap-urls.csv"');
  res.send('\ufeff' + stringify(rows.map(r => ({ ...r, has_number: r.has_number ? 'yes' : 'no', has_special: r.has_special ? 'yes' : 'no' })),
    { header: true, columns: ['id', 'name', 'url', 'slug', 'has_number', 'has_special', 'status', 'product_ref', 'lastmod', 'sitemap_url'] }));
}));

module.exports = router;
