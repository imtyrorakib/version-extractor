// CLI worker for cron: `node worker.js --once`
require('dotenv').config();
const db = require('./src/db');
const queue = require('./src/services/queue');

(async () => {
  await db.migrate();
  const r = await queue.drain(Number(process.env.CRON_BUDGET_MS) || 50000);
  console.log(new Date().toISOString(), 'processed', r.processed, 'jobs in', r.ms, 'ms');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
