const cheerio = require('cheerio');
const { findVersions, pick, previousOf, compare, isPre } = require('./version-utils');

async function fetchText(url, s, extraHeaders = {}) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': s.user_agent, Accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8', ...extraHeaders },
    signal: AbortSignal.timeout(Number(s.request_timeout_ms) || 20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const type = res.headers.get('content-type') || '';
  const body = (await res.text()).slice(0, 3_000_000);
  return { body, type };
}

const result = (cands, mode, method) => {
  const version = pick(cands, mode);
  return { version, previous: previousOf(cands, version), method, candidates: cands.slice(0, 15) };
};

async function tryGithub(url, s) {
  const m = url.match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i);
  if (!m || /\.(md|txt)$/i.test(url) || /\/blob\//.test(url)) return null;
  const repo = `${m[1]}/${m[2].replace(/\.git$/, '')}`;
  const headers = { Accept: 'application/vnd.github+json' };
  try {
    const { body } = await fetchText(`https://api.github.com/repos/${repo}/releases?per_page=20`, s, headers);
    const rel = JSON.parse(body).filter(r => !r.draft);
    const stable = rel.filter(r => !r.prerelease);
    const vers = (stable.length ? stable : rel).map(r => findVersions(r.tag_name || r.name || '')[0]).filter(Boolean);
    if (vers.length) return { version: vers[0], previous: previousOf(vers, vers[0]), method: 'github:releases' };
  } catch (_) { /* try tags */ }
  try {
    const { body } = await fetchText(`https://api.github.com/repos/${repo}/tags?per_page=30`, s, headers);
    let vers = JSON.parse(body).map(t => findVersions(t.name)[0]).filter(Boolean);
    if (vers.some(v => !isPre(v))) vers = vers.filter(v => !isPre(v));
    vers.sort((a, b) => compare(b, a));
    if (vers.length) return { version: vers[0], previous: previousOf(vers, vers[0]), method: 'github:tags' };
  } catch (_) { /* fall through */ }
  return null;
}

function fromHtml(html, mode) {
  const $ = cheerio.load(html);
  $('script,style,noscript,svg,iframe,footer,nav,form').remove();
  const tier1 = [];
  $('h1,h2,h3,h4,h5,h6,[class*="version"],[class*="Version"],[id*="version"],[class*="release"],[class*="Release"],dt,summary').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t && t.length <= 200 && tier1.length < 80) tier1.push(...findVersions(t));
  });
  if (tier1.length) return result(tier1, mode, 'heading');
  return fromText($('body').text().replace(/[ \t]+/g, ' '), mode);
}

function fromText(text, mode) {
  const heads = [];
  for (const line of text.split(/\r?\n/)) {
    if (heads.length > 80) break;
    if (/^\s{0,3}(#{1,6}\s|=+\s*v?\d|\[?v?\d+\.\d+)/i.test(line) || /^\s*(version|release|v)\s*[:\-]?\s*\d/i.test(line)) {
      heads.push(...findVersions(line.slice(0, 200)));
    }
  }
  if (heads.length) return result(heads, mode, 'text-heading');

  const kw = [];
  const re = /(?:version|release|ver\.?|build)\s*[:#\-]?\s*(v?\d{1,4}(?:\.\d{1,6}){1,3}(?:[-.]?(?:alpha|beta|rc)\.?\d*)?)/gi;
  let m;
  while ((m = re.exec(text)) !== null && kw.length < 60) kw.push(...findVersions(m[1]));
  if (kw.length) return result(kw, mode, 'keyword');

  const generic = findVersions(text.slice(0, 8000));
  if (generic.length) return result(generic, 'smart', 'generic');
  return { version: null, previous: null, method: null, candidates: [] };
}

async function extractVersion(url, s) {
  if (/github\.com/i.test(url)) {
    const gh = await tryGithub(url, s);
    if (gh) return gh;
  }
  const fetchUrl = url.replace(/github\.com\/([^\/]+)\/([^\/]+)\/blob\//i, 'raw.githubusercontent.com/$1/$2/');
  const { body, type } = await fetchText(fetchUrl, s);
  if (/html|xml/i.test(type) || /^\s*</.test(body)) return fromHtml(body, s.version_pick);
  if (/json/i.test(type)) {
    try {
      const j = JSON.parse(body);
      const v = j.version || j.latest_version || j.tag_name || j.data?.version;
      if (v) return { version: String(v), previous: j.previous_version || null, method: 'json' };
    } catch (_) { /* fall through */ }
  }
  return fromText(body, s.version_pick);
}

module.exports = { extractVersion, fromHtml, fromText };
