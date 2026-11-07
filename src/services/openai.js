const { cleanVersion } = require('./version-utils');

class RetryableError extends Error { constructor(msg) { super(msg); this.retryable = true; } }

function outputText(d) {
  if (typeof d.output_text === 'string' && d.output_text) return d.output_text;
  let s = '';
  for (const item of d.output || []) {
    if (item.type === 'message') for (const c of item.content || []) if (c.type === 'output_text') s += c.text;
  }
  return s;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (_) { /* continue */ }
  const m = String(text).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) { /* ignore */ } }
  return null;
}

async function callResponses(s, input, { webSearch = true } = {}) {
  const key = s.openai_api_key || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key is not configured (Settings page or OPENAI_API_KEY env).');
  const body = { model: s.openai_model, input };
  if (webSearch) body.tools = [{ type: s.openai_search_tool || 'web_search' }];
  let res;
  try {
    res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
  } catch (e) { throw new RetryableError(`OpenAI network error: ${e.message}`); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 429 || res.status >= 500) throw new RetryableError(`OpenAI ${res.status}: ${data.error?.message || 'temporary error'}`);
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data.error?.message || 'request failed'}`);
  return outputText(data);
}

function describe(p) {
  return [`Product name: ${p.name}`, p.sku && `SKU: ${p.sku}`, p.product_id && `Product ID: ${p.product_id}`, p.changelog_url && `Known changelog URL: ${p.changelog_url}`, p.product_url && `Product page URL: ${p.product_url}`]
    .filter(Boolean).join('\n');
}

async function findVersion(p, s) {
  const prompt = `Search the web and find the LATEST officially released (stable, non-beta unless only beta exists) version number of this software product, AND the version released immediately before it.
Prefer the vendor's official changelog, release notes, download page or official repository.
${describe(p)}

Reply with ONLY a JSON object, no markdown:
{"version": "x.y.z or null", "previous_version": "x.y.z or null", "release_date": "YYYY-MM-DD or null", "source_url": "url used", "confidence": "high|medium|low", "notes": "short note"}`;
  const j = parseJson(await callResponses(s, prompt));
  if (!j) return { version: null, notes: 'AI returned an unparseable answer' };
  const version = cleanVersion(j.version);
  let previous = cleanVersion(j.previous_version);
  if (previous && previous === version) previous = null;
  return { version, previous, source_url: j.source_url || null, notes: [j.confidence && `confidence: ${j.confidence}`, j.release_date && `released: ${j.release_date}`, j.notes].filter(Boolean).join(' | ') };
}

async function findChangelogUrl(p, s) {
  const prompt = `Search the web and find the OFFICIAL changelog / release notes / version history page URL for this software product.
${describe(p)}

Reply with ONLY a JSON object, no markdown:
{"changelog_url": "https://... or null", "confidence": "high|medium|low", "notes": "short note"}`;
  const j = parseJson(await callResponses(s, prompt));
  const url = j && typeof j.changelog_url === 'string' && /^https?:\/\//i.test(j.changelog_url) ? j.changelog_url.trim() : null;
  return { url, notes: j ? [j.confidence && `confidence: ${j.confidence}`, j.notes].filter(Boolean).join(' | ') : 'AI returned an unparseable answer' };
}

async function findDuplicateGroups(items, s) {
  const groups = [];
  const CHUNK = 150;
  for (let off = 0; off < items.length; off += CHUNK) {
    const chunk = items.slice(off, off + CHUNK);
    const lines = chunk.map((it, i) => `${i}\t${it.product_id || ''}\t${it.sku || ''}\t${it.name || ''}`).join('\n');
    const prompt = `Below is a tab-separated list of products: index, product_id, sku, name.
Identify groups of rows that refer to the SAME product (same software/product even if the name differs in casing, punctuation, word order, edition suffixes like "(Lifetime)", vendor prefix, or version numbers). Different editions that are genuinely different products (e.g. "Pro" vs "Lite") are NOT duplicates.

${lines}

Reply with ONLY JSON: {"groups": [[index, index, ...], ...]} listing only groups with 2+ members.`;
    const j = parseJson(await callResponses(s, prompt, { webSearch: false }));
    for (const g of (j && Array.isArray(j.groups) ? j.groups : [])) {
      const idx = g.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < chunk.length).map(n => n + off);
      if (idx.length > 1) groups.push([...new Set(idx)]);
    }
  }
  return groups;
}

/** items: [{id, slug, name, url}] -> Map(id -> clean name) */
async function beautifyNames(items, s) {
  const out = new Map();
  for (let off = 0; off < items.length; off += 100) {
    const chunk = items.slice(off, off + 100);
    const lines = chunk.map((it, i) => `${i}\t${it.slug || ''}\t${it.name || ''}`).join('\n');
    const prompt = `Each line is: index, URL slug, current auto-generated name of a product page.
Write a clean, human-friendly PRODUCT NAME for each: correct brand capitalisation (WordPress, WooCommerce, macOS, iOS, SEO, PDF...),
remove marketing filler like "download", "buy", "best", "free", "review", tracking IDs and trailing numeric IDs,
keep real edition words (Pro, Lite, Premium) and real version numbers only if they are part of the product name.

${lines}

Reply with ONLY JSON: {"names": {"<index>": "Clean Name", ...}}`;
    const j = parseJson(await callResponses(s, prompt, { webSearch: false }));
    const names = (j && j.names) || {};
    chunk.forEach((it, i) => { const n = names[i] ?? names[String(i)]; if (typeof n === 'string' && n.trim()) out.set(it.id, n.trim().slice(0, 500)); });
  }
  return out;
}

async function testConnection(s) {
  return (await callResponses(s, 'Reply with the single word: OK', { webSearch: false })).trim();
}

module.exports = { findVersion, findChangelogUrl, findDuplicateGroups, beautifyNames, testConnection, RetryableError };
