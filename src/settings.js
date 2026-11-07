const db = require('./db');

const DEFAULTS = {
  extraction_mode: 'both',          // changelog | ai | both
  ai_find_changelog: '1',
  version_pick: 'smart',            // smart | first | highest
  openai_api_key: '',
  openai_model: 'gpt-6-luna',
  openai_search_tool: 'web_search', // web_search | web_search_preview
  worker_enabled: '1',
  worker_interval_sec: '20',
  batch_size: '3',
  max_attempts: '2',
  request_timeout_ms: '20000',
  dedupe_method: 'regex',           // none | regex | ai
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
};

let cache = null, cacheAt = 0;

async function getAll() {
  if (cache && Date.now() - cacheAt < 5000) return cache;
  const rows = await db.query('SELECT k, v FROM settings');
  const s = { ...DEFAULTS };
  for (const r of rows) if (r.k in DEFAULTS) s[r.k] = r.v ?? '';
  if (!s.openai_api_key && process.env.OPENAI_API_KEY) s.openai_api_key = process.env.OPENAI_API_KEY;
  cache = s; cacheAt = Date.now();
  return s;
}

async function save(values) {
  for (const [k, v] of Object.entries(values)) {
    if (!(k in DEFAULTS)) continue;
    if (k === 'openai_api_key' && (v === undefined || String(v).includes('•'))) continue;
    await db.query('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, String(v ?? '')]);
  }
  cache = null;
  return getAll();
}

function masked(s) {
  const k = s.openai_api_key || '';
  return { ...s, openai_api_key: k ? `${k.slice(0, 5)}••••••${k.slice(-4)}` : '' };
}

module.exports = { getAll, save, masked, DEFAULTS };
