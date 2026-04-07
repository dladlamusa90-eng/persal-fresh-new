const { Client } = require("pg");

const ADMIN_ROLE = "ADMIN";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      'DELETE FROM "Loan" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" <> $1)',
      [ADMIN_ROLE]
    );
    await client.query(
      'DELETE FROM "LoanApplicationDraft" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" <> $1)',
      [ADMIN_ROLE]
    );
    await client.query(
      'DELETE FROM "AdminNotification" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" <> $1)',
      [ADMIN_ROLE]
    );
    await client.query(
      'DELETE FROM "UserPointsEvent" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" <> $1)',
      [ADMIN_ROLE]
    );
    await client.query(
      'DELETE FROM "LoginOtp" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" <> $1)',
      [ADMIN_ROLE]
    );
    await client.query(
      'DELETE FROM "PasswordResetOtp" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" <> $1)',
      [ADMIN_ROLE]
    );
    const del = await client.query('DELETE FROM "User" WHERE "role" <> $1', [ADMIN_ROLE]);

    await client.query("COMMIT");
    console.log(`Deleted ${del.rowCount} non-admin user(s).`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
