const { Client } = require("pg");
const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_lNZ0twSFhrX6@ep-shy-block-aq42wack.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
});
client.connect().then(async () => {
  const r = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'User' ORDER BY ordinal_position"
  );
  console.log("DB columns:", r.rows.map((x) => x.column_name).join(", "));
  client.end();
}).catch(e => { console.error("Error:", e.message); process.exit(1); });
