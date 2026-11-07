const VERSION_RE = /(?<![\w.\/-])v?(\d{1,4}(?:\.\d{1,6}){1,3}(?:[-.]?(?:alpha|beta|rc|pre|preview)\.?\d*)?)(?!\d|\.\d|[a-z])/gi;
const UNIT_AFTER = /^\s?(%|mb|gb|kb|tb|ms|px|em|rem|sec|secs|seconds|min|mins|minutes|hours|hrs|days|stars|x\b|k\b|m\b|inch|"|mm|cm|ghz|mhz)/i;
const DEP_BEFORE = /(php|wordpress|wp|woocommerce|requires?|required|tested up to|compatible with|node(\.js)?|python|mysql|mariadb|ios|android|windows|macos|java|jquery|bootstrap|react|laravel|\.net|chrome|firefox)\s*(version|v)?\s*[:>=]*\s*$/i;
const DMY_DATE = /^\d{1,2}\.\d{1,2}\.(19|20)\d{2}$/;

function findVersions(text) {
  const out = [];
  if (!text) return out;
  VERSION_RE.lastIndex = 0;
  let m;
  while ((m = VERSION_RE.exec(text)) !== null) {
    const v = m[1];
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 8);
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (UNIT_AFTER.test(after) || DMY_DATE.test(v) || DEP_BEFORE.test(before)) continue;
    out.push(v);
  }
  return out;
}

function parse(v) {
  const [core, pre] = String(v).toLowerCase().replace(/^v/, '').split(/[-]?(?=alpha|beta|rc|pre|preview)/);
  return { nums: core.split('.').map(n => parseInt(n, 10) || 0), pre: pre || null };
}
const isPre = v => !!parse(v).pre;

function compare(a, b) {
  const A = parse(a), B = parse(b);
  for (let i = 0; i < Math.max(A.nums.length, B.nums.length); i++) {
    const d = (A.nums[i] || 0) - (B.nums[i] || 0);
    if (d) return d;
  }
  if (A.pre && !B.pre) return -1;
  if (!A.pre && B.pre) return 1;
  return (A.pre || '').localeCompare(B.pre || '', undefined, { numeric: true });
}

function pick(candidates, mode = 'smart') {
  if (!candidates.length) return null;
  if (mode === 'first') return candidates[0];
  let pool = mode === 'highest' ? candidates : candidates.slice(0, 5);
  if (pool.some(v => !isPre(v))) pool = pool.filter(v => !isPre(v)); // prefer stable releases
  return pool.reduce((best, v) => (compare(v, best) > 0 ? v : best), pool[0]);
}

/** The release just before `version`: highest candidate strictly lower (stable preferred if current is stable). */
function previousOf(candidates, version) {
  if (!version) return null;
  let lower = [...new Set(candidates)].filter(c => compare(c, version) < 0);
  if (!isPre(version) && lower.some(c => !isPre(c))) lower = lower.filter(c => !isPre(c));
  if (!lower.length) return null;
  return lower.reduce((best, v) => (compare(v, best) > 0 ? v : best), lower[0]);
}

function cleanVersion(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/^v(?=\d)/i, '');
  if (!/\d/.test(s) || /not\s*found|unknown|n\/a|null/i.test(s)) return null;
  return s.slice(0, 100);
}

module.exports = { findVersions, compare, pick, previousOf, cleanVersion, isPre };
