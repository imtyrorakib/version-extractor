/**
 * In-page login (no browser popup): signed, HttpOnly session cookie.
 * Credentials: ADMIN_USER / ADMIN_PASS. If both are empty, login is disabled.
 */
const crypto = require('crypto');

const COOKIE = 've_session';
const enabled = () => Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASS);
const secret = () => process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASS}:${process.env.CRON_KEY || ''}:ve-session`).digest('hex');
const sign = data => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

function safeEqual(a, b) {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

function readSession(req) {
  const token = cookies(req)[COOKIE];
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return d.exp > Date.now() ? d : null;
  } catch { return null; }
}

function setCookie(req, res, value, maxAgeSec) {
  const parts = [`${COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (req.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// simple brute-force protection: 10 failed attempts per IP per 15 minutes
const fails = new Map();
function tooMany(ip) {
  const f = fails.get(ip);
  if (f && f.until < Date.now()) { fails.delete(ip); return false; }
  return f && f.count >= 10;
}

function routes(app) {
  app.get('/auth/me', (req, res) => {
    if (!enabled()) return res.json({ user: 'admin', authDisabled: true });
    const s = readSession(req);
    return s ? res.json({ user: s.u }) : res.status(401).json({ error: 'Not logged in' });
  });

  app.post('/auth/login', (req, res) => {
    if (!enabled()) return res.json({ user: 'admin', authDisabled: true });
    const ip = req.ip;
    if (tooMany(ip)) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    const { username = '', password = '', remember } = req.body || {};
    if (safeEqual(username, process.env.ADMIN_USER) && safeEqual(password, process.env.ADMIN_PASS)) {
      fails.delete(ip);
      const maxAge = remember ? 30 * 86400 : 12 * 3600;
      const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + maxAge * 1000 })).toString('base64url');
      setCookie(req, res, `${payload}.${sign(payload)}`, maxAge);
      return res.json({ user: username });
    }
    const f = fails.get(ip) || { count: 0, until: Date.now() + 15 * 60000 };
    f.count++; fails.set(ip, f);
    res.status(401).json({ error: 'Invalid username or password' });
  });

  app.post('/auth/logout', (req, res) => { setCookie(req, res, '', 0); res.json({ ok: true }); });
}

function requireAuth(req, res, next) {
  if (!enabled() || readSession(req)) return next();
  res.status(401).json({ error: 'Login required' });
}

module.exports = { routes, requireAuth };
