import { Client } from "pg";

const ADMIN_EMAIL = "admin@persal.co.za";
const USER_EMAIL = "sinenhlanhlamusa9@gmail.com";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const adminRes = await client.query(
      'SELECT id, role FROM "User" WHERE lower(email) = lower($1) LIMIT 1',
      [ADMIN_EMAIL]
    );
    const userRes = await client.query(
      'SELECT id, role FROM "User" WHERE lower(email) = lower($1) LIMIT 1',
      [USER_EMAIL]
    );

    if (adminRes.rowCount === 0) throw new Error("Admin not found");
    if (userRes.rowCount === 0) throw new Error("Target user not found");

    const admin = adminRes.rows[0] as { id: string; role: string };
    const user = userRes.rows[0] as { id: string; role: string };

    const insertRes = await client.query(
      'INSERT INTO "AdminNotification" (id, "userId", type, title, body, "createdById", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, title, body, "createdAt"',
      [
        `diag_${Date.now()}`,
        user.id,
        "MESSAGE",
        "Diagnostic Message",
        "Testing admin message insert",
        admin.id,
      ]
    );

    console.log(
      JSON.stringify(
        {
          admin,
          user,
          inserted: insertRes.rows[0],
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
