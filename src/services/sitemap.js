/**
 * Sitemap module: fetch sitemap(s) -> extract URLs -> generate pretty product names -> flag numbers / special chars.
 * Supports: urlset, sitemap index (nested, recursive), .xml.gz, plain-text sitemaps, robots.txt "Sitemap:" lines.
 */
const zlib = require('zlib');
const crypto = require('crypto');

const hash = url => crypto.createHash('sha1').update(url).digest('hex');

/* --------------------------------------------------------------- fetching */
async function fetchBody(url, s) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': s.user_agent, Accept: 'application/xml,text/xml,text/plain,*/*;q=0.8' },
    signal: AbortSignal.timeout(Math.max(Number(s.request_timeout_ms) || 20000, 30000)),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  let buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf); // .gz sitemap
  return buf.toString('utf8');
}

const decodeXml = t => t
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .trim();

function parseSitemap(body) {
  const isIndex = /<sitemapindex[\s>]/i.test(body);
  const entries = [];
  const blockRe = isIndex ? /<sitemap[\s>][\s\S]*?<\/sitemap>/gi : /<url[\s>][\s\S]*?<\/url>/gi;
  let m;
  while ((m = blockRe.exec(body)) !== null) {
    const loc = (m[0].match(/<loc[^>]*>([\s\S]*?)<\/loc>/i) || [])[1];
    const lastmod = (m[0].match(/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i) || [])[1];
    if (loc) entries.push({ loc: decodeXml(loc), lastmod: lastmod ? decodeXml(lastmod).slice(0, 40) : null });
  }
  if (!entries.length && !/<(urlset|sitemapindex)/i.test(body)) {
    // plain text sitemap or robots.txt
    const sitemapLines = [...body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map(x => x[1]);
    if (sitemapLines.length) return { isIndex: true, entries: sitemapLines.map(loc => ({ loc, lastmod: null })) };
    body.split(/\r?\n/).map(l => l.trim()).filter(l => /^https?:\/\//i.test(l)).forEach(loc => entries.push({ loc, lastmod: null }));
  }
  return { isIndex, entries };
}

/**
 * Crawl a sitemap (follows sitemap indexes). opts: { maxUrls, maxSitemaps, childFilter }
 * returns { urls: [{url, lastmod, sitemap}], sitemaps: [...], errors: [...] }
 */
async function crawl(startUrl, s, opts = {}) {
  return crawlMany([startUrl], s, opts);
}

/** Crawl several sitemaps; `seed` = URLs already known (e.g. from pasted text) that count toward maxUrls. */
async function crawlMany(startUrls, s, opts = {}, seed = []) {
  const maxUrls = opts.maxUrls || 50000, maxSitemaps = opts.maxSitemaps || 200;
  const queue = [...startUrls], seenMaps = new Set(), seenUrls = new Set();
  const urls = [], errors = [], sitemaps = [];
  for (const u of seed) {
    if (urls.length >= maxUrls) break;
    if (!seenUrls.has(u.url)) { seenUrls.add(u.url); urls.push(u); }
  }
  let childRe = null;
  if (opts.childFilter) { try { childRe = new RegExp(opts.childFilter, 'i'); } catch { throw new Error('Invalid child sitemap filter (regex)'); } }

  while (queue.length && seenMaps.size < maxSitemaps && urls.length < maxUrls) {
    const sm = queue.shift();
    if (seenMaps.has(sm)) continue;
    seenMaps.add(sm);
    try {
      const { isIndex, entries } = parseSitemap(await fetchBody(sm, s));
      sitemaps.push({ url: sm, type: isIndex ? 'index' : 'urlset', count: entries.length });
      for (const e of entries) {
        if (isIndex) { if (!childRe || childRe.test(e.loc)) queue.push(e.loc); continue; }
        if (seenUrls.has(e.loc)) continue;
        seenUrls.add(e.loc);
        urls.push({ url: e.loc, lastmod: e.lastmod, sitemap: sm });
        if (urls.length >= maxUrls) break;
      }
    } catch (err) { errors.push({ sitemap: sm, error: err.message }); }
  }
  return { urls, sitemaps, errors, truncated: urls.length >= maxUrls || queue.length > 0 };
}

/* ------------------------------------------------------- pasted raw text */
const PASTE_SOURCE = '(pasted text)';
const isSitemapLink = u => /(\.xml(\.gz)?|\/robots\.txt)(\?.*)?$/i.test(u) || /sitemap[^/]*$/i.test(u.split('?')[0]);

/** Pull every http(s) URL out of any text: plain list, HTML, CSV, JSON, markdown, XML… */
function urlsInText(text) {
  const out = [], seen = new Set();
  const re = /https?:\/\/[^\s"'<>()\[\]{}|\\^`,]+/gi;
  let m;
  const t = String(text).replace(/&amp;/g, '&');
  while ((m = re.exec(t)) !== null) {
    let u = m[0].replace(/[.,;:!?*)\]}>'"]+$/, '');        // trailing punctuation from prose / markdown
    try { u = new URL(u).href; } catch { continue; }
    if (!seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}

/**
 * Raw text -> URLs. If the text IS sitemap XML it is parsed as a sitemap (an index is followed).
 * Otherwise every URL is extracted; links that look like sitemaps are crawled when opts.followSitemaps is on.
 */
async function fromText(text, s, opts = {}) {
  const raw = String(text || '');
  let pages = [], maps = [];
  if (/<(urlset|sitemapindex)[\s>]/i.test(raw)) {
    const { isIndex, entries } = parseSitemap(raw);
    if (isIndex) maps = entries.map(e => e.loc);
    else pages = entries.map(e => ({ url: e.loc, lastmod: e.lastmod, sitemap: PASTE_SOURCE }));
  } else {
    for (const u of urlsInText(raw)) {
      if (opts.followSitemaps && isSitemapLink(u)) maps.push(u);
      else pages.push({ url: u, lastmod: null, sitemap: PASTE_SOURCE });
    }
  }
  const r = await crawlMany(maps, s, opts, pages);
  return { ...r, from_text: Math.min(pages.length, r.urls.length), sitemap_links: maps.length };
}

/* ------------------------------------------------------------- naming */
const SPECIAL_WORDS = {
  wordpress: 'WordPress', woocommerce: 'WooCommerce', javascript: 'JavaScript', typescript: 'TypeScript', github: 'GitHub',
  youtube: 'YouTube', linkedin: 'LinkedIn', paypal: 'PayPal', iphone: 'iPhone', ipad: 'iPad', ios: 'iOS', macos: 'macOS',
  mysql: 'MySQL', postgresql: 'PostgreSQL', mongodb: 'MongoDB', nodejs: 'Node.js', jquery: 'jQuery', phpstorm: 'PhpStorm',
  onedrive: 'OneDrive', powerpoint: 'PowerPoint', sharepoint: 'SharePoint', autocad: 'AutoCAD', elementor: 'Elementor',
  wpml: 'WPML', seo: 'SEO', wp: 'WP', pdf: 'PDF', ai: 'AI', api: 'API', css: 'CSS', html: 'HTML', php: 'PHP', js: 'JS',
  ui: 'UI', ux: 'UX', vpn: 'VPN', crm: 'CRM', erp: 'ERP', sql: 'SQL', xml: 'XML', json: 'JSON', csv: 'CSV', smtp: 'SMTP',
  ssl: 'SSL', cdn: 'CDN', dns: 'DNS', ftp: 'FTP', lms: 'LMS', cms: 'CMS', amp: 'AMP', gdpr: 'GDPR', b2b: 'B2B', b2c: 'B2C',
  ar: 'AR', vr: 'VR', '3d': '3D', '2d': '2D', hd: 'HD', '4k': '4K', usb: 'USB', gps: 'GPS', rss: 'RSS', sms: 'SMS', faq: 'FAQ',
  pro: 'Pro', lite: 'Lite', plus: 'Plus',
};
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'vs', 'via', 'with']);

/** Pick the slug from a URL. segment: 'last' | 'second_last' | 'query:<param>' */
function slugOf(url, segment = 'last') {
  let u;
  try { u = new URL(url); } catch { return String(url); }
  if (segment.startsWith('query:')) return u.searchParams.get(segment.slice(6)) || '';
  const parts = u.pathname.split('/').filter(Boolean);
  if (!parts.length) return u.hostname;
  const idx = segment === 'second_last' ? parts.length - 2 : parts.length - 1;
  return parts[Math.max(0, idx)];
}

/** "elementor-pro_v3-plugin.html" -> "Elementor Pro V3 Plugin" */
function prettify(slug, opts = {}) {
  let s = String(slug || '');
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  s = s.replace(/\.(html?|php|aspx?|jsp|cfm|shtml)$/i, '');           // file extensions
  if (opts.stripTrailingId) s = s.replace(/([-_.]+\d{5,}|[-_.]+(p|id|sku|item)[-_]?\d{2,}|[-_]+(?=[a-f0-9]*\d)(?=[a-f0-9]*[a-f])[a-f0-9]{8,})$/i, ''); // -12345, -p123, -id-77, -a1b2c3d4e5 (years kept)
  if (opts.removeWords) {
    const words = String(opts.removeWords).split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    if (words.length) s = s.split(/[-_\s]+/).filter(w => !words.includes(w.toLowerCase())).join('-');
  }
  s = s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();           // "-" and "_" -> spaces
  const words = s.split(' ');
  return words.map((w, i) => {
    const lw = w.toLowerCase();
    if (SPECIAL_WORDS[lw]) return SPECIAL_WORDS[lw];
    if (i > 0 && i < words.length - 1 && SMALL.has(lw)) return lw;
    if (/^v?\d+(\.\d+)*$/i.test(w)) return w.toLowerCase();             // versions / numbers as-is
    if (w !== lw && w !== w.toUpperCase()) return w;                   // already mixed case: keep (e.g. "iMac")
    return lw.charAt(0).toUpperCase() + lw.slice(1);
  }).join(' ');
}

const hasNumber = name => /\d/.test(name || '');
const hasSpecial = name => /[^\p{L}\p{N}\s]/u.test(name || '');      // anything that's not letter, digit or space

/* --------------------------------------------------------- bulk transforms */
const TRANSFORMS = {
  strip_numbers: n => n.replace(/\d+/g, ' '),
  strip_special: n => n.replace(/[^\p{L}\p{N}\s]/gu, ' '),
  title_case: n => prettify(n.replace(/\s+/g, '-')),
  trim_words: (n, arg) => {
    const words = String(arg || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    return n.split(/\s+/).filter(w => !words.includes(w.toLowerCase())).join(' ');
  },
  find_replace: (n, arg) => {
    const { find = '', replace = '', regex = false } = arg || {};
    if (!find) return n;
    if (regex) { try { return n.replace(new RegExp(find, 'gi'), replace); } catch { throw new Error('Invalid regex in Find'); } }
    return n.split(find).join(replace);
  },
};
const tidy = n => n.replace(/\s+/g, ' ').replace(/^[\s\-–—:|,.]+|[\s\-–—:|,]+$/g, '').trim();

module.exports = { crawl, crawlMany, fromText, urlsInText, PASTE_SOURCE, parseSitemap, slugOf, prettify, hasNumber, hasSpecial, TRANSFORMS, tidy, hash };
