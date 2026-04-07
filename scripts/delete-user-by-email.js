const { Client } = require("pg");

async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error("Usage: node scripts/delete-user-by-email.js <email>");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Look up the user first (guard against deleting admins)
  const lookup = await client.query(
    'SELECT id, role FROM "User" WHERE email = $1',
    [email]
  );

  if (lookup.rowCount === 0) {
    console.log("User not found.");
    await client.end();
    return;
  }

  const user = lookup.rows[0];
  if (user.role === "ADMIN") {
    console.error("Refusing to delete an ADMIN account.");
    await client.end();
    process.exit(1);
  }

  const userId = user.id;

  // Delete all related records first (Loan has no onDelete: Cascade)
  await client.query('DELETE FROM "Loan" WHERE "userId" = $1', [userId]);
  await client.query('DELETE FROM "LoanApplicationDraft" WHERE "userId" = $1', [userId]);
  await client.query('DELETE FROM "AdminNotification" WHERE "userId" = $1', [userId]);
  await client.query('DELETE FROM "UserPointsEvent" WHERE "userId" = $1', [userId]);
  await client.query('DELETE FROM "LoginOtp" WHERE "userId" = $1', [userId]);
  await client.query('DELETE FROM "PasswordResetOtp" WHERE "userId" = $1', [userId]);

  const result = await client.query(
    'DELETE FROM "User" WHERE id = $1',
    [userId]
  );

  console.log(`Deleted user (${email}): ${result.rowCount} row removed.`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
