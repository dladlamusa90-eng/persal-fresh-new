const { Client } = require("pg");
const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");

const ADMIN_EMAIL = "admin@persal.co.za";
const ADMIN_PASSWORD = "Admin@12345";
const ADMIN_NAME = "Persal Admin";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Wipe all users (cascades to loans, notifications, etc.)
    const del = await client.query('DELETE FROM "User"');
    console.log(`Deleted ${del.rowCount} user(s).`);

    // Recreate admin
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const id = randomUUID();

    await client.query(
      `INSERT INTO "User" ("id","fullName","email","password","role","isBurned","isDeleted","createdAt")
       VALUES ($1,$2,$3,$4,'ADMIN',false,false,NOW())`,
      [id, ADMIN_NAME, ADMIN_EMAIL, hashed]
    );

    console.log(`Admin recreated: ${ADMIN_EMAIL}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
