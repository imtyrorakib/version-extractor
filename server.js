require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const db = require('./src/db');
const queue = require('./src/services/queue');
const auth = require('./src/auth');

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Cron endpoint (Hostinger cron: curl "https://your-domain/cron/run?key=CRON_KEY")
app.get('/cron/run', async (req, res) => {
  const key = String(req.query.key || ''), expected = process.env.CRON_KEY || '';
  if (!expected || key.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected))) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try { res.json(await queue.drain(Number(req.query.budget) || 50000)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/health', (req, res) => res.json({ ok: true }));

auth.routes(app);                                   // /auth/login, /auth/logout, /auth/me
app.use('/api/sitemap', auth.requireAuth, require('./src/routes/sitemap'));
app.use('/api', auth.requireAuth, require('./src/routes/api'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
db.migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`Version Extractor running on http://localhost:${PORT}`));
    if (process.env.INTERNAL_WORKER !== '0') queue.startWorker();
  })
  .catch(e => { console.error('Database init failed:', e.message); process.exit(1); });
