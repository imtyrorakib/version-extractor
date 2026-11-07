const ai = require('./openai');

function normName(n) {
  return String(n || '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\bv?\d+(\.\d+)+\b/g, ' ')
    .replace(/\b(version|ver|edition|license|licence)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
const normKey = v => String(v || '').trim().toLowerCase();

async function dedupe(items, opts) {
  const { method = 'regex', keys = ['product_id', 'sku', 'name'], existing = [], settings } = opts;
  if (method === 'none') return { unique: items, duplicates: [] };

  const seen = { product_id: new Map(), sku: new Map(), name: new Map() };
  const keyOf = (k, it) => (k === 'name' ? normName(it.name) : normKey(it[k]));
  for (const e of existing) for (const k of keys) { const v = keyOf(k, e); if (v) seen[k].set(v, `existing #${e.id}`); }

  const unique = [], duplicates = [];
  items.forEach((it, row) => {
    let reason = null;
    for (const k of keys) {
      const v = keyOf(k, it);
      if (v && seen[k].has(v)) { reason = `same ${k} as ${seen[k].get(v)}`; break; }
    }
    if (reason) { duplicates.push({ row: it._row ?? row + 2, item: it, reason }); return; }
    for (const k of keys) { const v = keyOf(k, it); if (v) seen[k].set(v, `row ${it._row ?? row + 2}`); }
    unique.push(it);
  });

  if (method !== 'ai' || unique.length < 2) return { unique, duplicates };

  const groups = await ai.findDuplicateGroups(unique, settings);
  const drop = new Map();
  for (const g of groups) {
    const [keep, ...rest] = g.sort((a, b) => a - b);
    for (const i of rest) if (!drop.has(i)) drop.set(i, `AI: same product as row ${unique[keep]._row ?? keep + 2} (${unique[keep].name})`);
  }
  const finalUnique = [];
  unique.forEach((it, i) => (drop.has(i) ? duplicates.push({ row: it._row ?? i + 2, item: it, reason: drop.get(i) }) : finalUnique.push(it)));
  return { unique: finalUnique, duplicates };
}

module.exports = { dedupe, normName };
