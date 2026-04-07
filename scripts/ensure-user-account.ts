import bcrypt from "bcrypt";
import { Client } from "pg";
import { randomUUID } from "crypto";

const EMAIL = process.argv[2]?.trim().toLowerCase();
const PASSWORD = process.argv[3] ?? "";
const FULL_NAME = process.argv[4]?.trim() || "Persal User";

if (!EMAIL || !PASSWORD) {
  console.error("Usage: npx ts-node -r dotenv/config scripts/ensure-user-account.ts <email> <password> [fullName]");
  process.exit(1);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const columnsRes = await client.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User'
      `
    );
    const columns = new Set(columnsRes.rows.map((row: { column_name: string }) => row.column_name));

    const existingRes = await client.query(
      'SELECT id FROM "User" WHERE lower(email) = lower($1) LIMIT 1',
      [EMAIL]
    );
    const existing = existingRes.rows[0] as { id: string } | undefined;

    const hashed = await bcrypt.hash(PASSWORD, 12);

    if (!existing) {
      const insertColumns = ['"id"', '"fullName"', '"email"', '"password"', '"role"', '"isBurned"', '"burnedAt"'];
      const insertValues = [
        "$1",
        "$2",
        "$3",
        "$4",
        "'USER'",
        "false",
        "NULL",
      ];
      const params: Array<string | boolean | null> = [randomUUID(), FULL_NAME, EMAIL, hashed];

      if (columns.has("isDeleted")) {
        insertColumns.push('"isDeleted"');
        insertValues.push("false");
      }

      if (columns.has("deletedAt")) {
        insertColumns.push('"deletedAt"');
        insertValues.push("NULL");
      }

      await client.query(
        `INSERT INTO "User" (${insertColumns.join(", ")}) VALUES (${insertValues.join(", ")})`,
        params
      );
    } else {
      const setParts: string[] = ['"password" = $1', '"role" = $2', '"isBurned" = $3', '"burnedAt" = $4'];
      const values: Array<string | boolean | null> = [hashed, "USER", false, null];

      if (columns.has("isDeleted")) {
        setParts.push(`"isDeleted" = $${values.length + 1}`);
        values.push(false);
      }

      if (columns.has("deletedAt")) {
        setParts.push(`"deletedAt" = $${values.length + 1}`);
        values.push(null);
      }

      values.push(existing.id);

      await client.query(
        `UPDATE "User" SET ${setParts.join(", ")} WHERE id = $${values.length}`,
        values
      );
    }

    const verifyRes = await client.query(
      'SELECT id, email, role, "isBurned", password FROM "User" WHERE lower(email) = lower($1) LIMIT 1',
      [EMAIL]
    );

    const user = verifyRes.rows[0] as {
      id: string;
      email: string;
      role: string;
      isBurned: boolean;
      password: string;
    } | undefined;

    if (!user) {
      throw new Error("User not found after upsert");
    }

    const passwordMatches = await bcrypt.compare(PASSWORD, user.password);

    console.log(
      JSON.stringify(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          isBurned: user.isBurned,
          passwordMatches,
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
