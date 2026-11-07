const crypto = require('crypto');
const db = require('../db');
const settings = require('../settings');
const changelog = require('./changelog');
const ai = require('./openai');
const { compare } = require('./version-utils');

// Lower number = runs first. All changelog jobs finish before any AI job starts.
const PRIORITY = { changelog: 10, ai_changelog: 20, ai_version: 30 };

function planJob(p, s) {
  const mode = s.extraction_mode;
  if (mode === 'ai') return { type: 'ai_version' };
  if (p.changelog_url) return { type: 'changelog' };
  if (s.ai_find_changelog === '1') return { type: 'ai_changelog' };
  if (mode === 'both') return { type: 'ai_version' };
  return { type: null, reason: 'No changelog URL (mode = changelog only, AI changelog finder off)' };
}

async function enqueue(ids, type = 'auto') {
  const s = await settings.getAll();
  ids = [...new Set(ids.map(Number).filter(Boolean))];
  let queued = 0, skipped = 0;
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000);
    const products = await db.query('SELECT * FROM products WHERE id IN (?)', [chunk]);
    await db.query("DELETE FROM jobs WHERE status = 'pending' AND product_id IN (?)", [chunk]);
    const rows = [], queuedIds = [];
    for (const p of products) {
      let jobType = type, reason = null;
      if (type === 'auto') ({ type: jobType, reason } = planJob(p, s));
      else if (type === 'changelog' && !p.changelog_url) { jobType = null; reason = 'No changelog URL'; }
      if (!jobType) {
        skipped++;
        await db.query("UPDATE products SET status='not_found', last_error=? WHERE id=?", [reason, p.id]);
        continue;
      }
      rows.push([p.id, jobType, PRIORITY[jobType], JSON.stringify({ chain: type === 'auto' }), Number(s.max_attempts) || 2]);
      queuedIds.push(p.id);
    }
    if (rows.length) {
      await db.query('INSERT INTO jobs (product_id, type, priority, payload, max_attempts) VALUES ?', [rows]);
      await db.query("UPDATE products SET status='queued', last_error=NULL WHERE id IN (?)", [queuedIds]);
      queued += rows.length;
    }
  }
  kick();
  return { queued, skipped };
}

async function addFollowUp(productId, type, s, note) {
  await db.query('INSERT INTO jobs (product_id, type, priority, payload, max_attempts) VALUES (?,?,?,?,?)',
    [productId, type, PRIORITY[type], JSON.stringify({ chain: true }), Number(s.max_attempts) || 2]);
  await db.query("UPDATE products SET status='queued', last_error=? WHERE id=?", [note, productId]);
}

/** Previous version: extracted value, else the version we had stored before (if it is lower), else keep existing. */
function resolvePrevious(p, version, extracted) {
  if (extracted && extracted !== version) return extracted;
  if (p.version && p.version !== version && compare(p.version, version) < 0) return p.version;
  if (p.version === version && p.previous_version) return p.previous_version;
  return null;
}

// version_changed_at is set only when the version number really changes (first found or new release).
// It is assigned BEFORE version= because MySQL evaluates SET left-to-right with updated values.
const setFound = (p, version, previous, source, url, notes) => {
  const changed = (p.version || null) !== (version || null);
  return db.query(
    `UPDATE products SET ${changed ? 'version_changed_at=NOW(), ' : ''}version=?, previous_version=?, version_source=?, source_url=?, notes=?, status='found', last_error=NULL, checked_at=NOW() WHERE id=?`,
    [version, resolvePrevious(p, version, previous), source, url, notes || null, p.id]);
};
const setNotFound = (id, msg) => db.query("UPDATE products SET status='not_found', last_error=?, checked_at=NOW() WHERE id=?", [msg, id]);

async function processJob(job, s) {
  const [p] = await db.query('SELECT * FROM products WHERE id=?', [job.product_id]);
  if (!p) return;
  const chain = JSON.parse(job.payload || '{}').chain;
  const aiFallback = chain && s.extraction_mode === 'both';
  await db.query("UPDATE products SET status='processing' WHERE id=?", [p.id]);

  if (job.type === 'changelog') {
    let r;
    try { r = await changelog.extractVersion(p.changelog_url, s); }
    catch (e) {
      if (job.attempts < job.max_attempts) throw Object.assign(e, { retryable: true });
      r = { version: null, error: e.message };
    }
    if (r.version) return setFound(p, r.version, r.previous, 'changelog', p.changelog_url, `method: ${r.method}`);
    const msg = r.error || 'Version not found on changelog page';
    return aiFallback ? addFollowUp(p.id, 'ai_version', s, `${msg} → queued for AI`) : setNotFound(p.id, msg);
  }

  if (job.type === 'ai_changelog') {
    const r = await ai.findChangelogUrl(p, s);
    if (r.url) {
      await db.query('UPDATE products SET changelog_url=?, notes=? WHERE id=?', [r.url, `changelog via AI: ${r.notes}`, p.id]);
      if (chain) return addFollowUp(p.id, 'changelog', s, null);
      return db.query('UPDATE products SET status=?, last_error=NULL WHERE id=?', [p.version ? 'found' : 'new', p.id]);
    }
    return (chain && s.extraction_mode === 'both')
      ? addFollowUp(p.id, 'ai_version', s, 'AI could not find changelog URL → queued for AI version search')
      : setNotFound(p.id, 'AI could not find a changelog URL');
  }

  if (job.type === 'ai_version') {
    const r = await ai.findVersion(p, s);
    return r.version ? setFound(p, r.version, r.previous, 'ai', r.source_url, r.notes) : setNotFound(p.id, `AI: version not found. ${r.notes || ''}`);
  }
  throw new Error(`Unknown job type ${job.type}`);
}

let busy = false;
async function tick() {
  if (busy) return { processed: 0, busy: true };
  busy = true;
  try {
    const s = await settings.getAll();
    await db.query("UPDATE jobs SET status='pending', locked_by=NULL WHERE status='running' AND locked_at < NOW() - INTERVAL 10 MINUTE");
    const token = crypto.randomUUID();
    const n = Math.max(1, Math.min(20, Number(s.batch_size) || 3));
    if (db.client === 'mysql') {
      await db.query(
        "UPDATE jobs SET status='running', locked_by=?, locked_at=NOW(), attempts=attempts+1 WHERE status='pending' AND run_after <= NOW() ORDER BY priority ASC, id ASC LIMIT ?",
        [token, n]);
    } else {
      await db.query(
        "UPDATE jobs SET status='running', locked_by=?, locked_at=NOW(), attempts=attempts+1 WHERE id IN (SELECT id FROM jobs WHERE status='pending' AND run_after <= NOW() ORDER BY priority ASC, id ASC LIMIT ?)",
        [token, n]);
    }
    const jobs = await db.query("SELECT * FROM jobs WHERE locked_by=? AND status='running'", [token]);
    await Promise.all(jobs.map(async job => {
      try {
        await processJob(job, s);
        await db.query("UPDATE jobs SET status='done', last_error=NULL WHERE id=?", [job.id]);
      } catch (e) {
        const retry = e.retryable && job.attempts < job.max_attempts;
        if (retry) {
          await db.query("UPDATE jobs SET status='pending', locked_by=NULL, last_error=?, run_after=NOW() + INTERVAL ? SECOND WHERE id=?",
            [e.message, 60 * job.attempts, job.id]);
          await db.query("UPDATE products SET status='queued', last_error=? WHERE id=?", [`Retrying: ${e.message}`, job.product_id]);
        } else {
          await db.query("UPDATE jobs SET status='failed', last_error=? WHERE id=?", [e.message, job.id]);
          await db.query("UPDATE products SET status='error', last_error=?, checked_at=NOW() WHERE id=?", [e.message, job.product_id]);
        }
      }
    }));
    return { processed: jobs.length };
  } finally { busy = false; }
}

async function drain(budgetMs = 50000) {
  const start = Date.now();
  let total = 0;
  while (Date.now() - start < budgetMs) {
    const r = await tick();
    if (r.busy || !r.processed) break;
    total += r.processed;
  }
  return { processed: total, ms: Date.now() - start };
}

let timer = null;
function kick() { if (timer) { clearTimeout(timer); timer = setTimeout(loop, 500); } }
async function loop() {
  let delay = 20000;
  try {
    const s = await settings.getAll();
    delay = (Number(s.worker_interval_sec) || 20) * 1000;
    if (s.worker_enabled === '1') {
      const r = await tick();
      if (r.processed) delay = 1000;
    }
  } catch (e) { console.error('[worker]', e.message); }
  timer = setTimeout(loop, delay);
}
function startWorker() { if (!timer) timer = setTimeout(loop, 3000); console.log('[worker] internal worker started'); }

async function stats() {
  const byStatus = await db.query('SELECT type, status, COUNT(*) c FROM jobs GROUP BY type, status');
  const products = await db.query('SELECT status, COUNT(*) c FROM products GROUP BY status');
  return { jobs: byStatus, products };
}

module.exports = { enqueue, tick, drain, startWorker, stats, PRIORITY, resolvePrevious };
