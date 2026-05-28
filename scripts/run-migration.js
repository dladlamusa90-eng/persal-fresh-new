const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://persal_user:990302@localhost:5432/persal_fresh' });
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function gen() {
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
async function run() {
  await c.connect();
  const { rows } = await c.query('SELECT id FROM "User" WHERE "referralCode" IS NULL');
  for (const row of rows) {
    let done = false;
    for (let i = 0; i < 20 && !done; i++) {
      const code = gen();
      try {
        await c.query('UPDATE "User" SET "referralCode"=$1 WHERE id=$2 AND "referralCode" IS NULL', [code, row.id]);
        done = true;
      } catch (e) {
        if (!e.message.includes('unique')) throw e;
      }
    }
  }
  console.log('Backfilled', rows.length, 'users');
  await c.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
