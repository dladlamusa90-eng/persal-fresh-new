import bcrypt from "bcrypt";
import { Client } from "pg";

const EMAIL = "admin@persal.co.za";
const PASSWORD = "Admin@12345";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const existingRes = await client.query(
      'SELECT id, email FROM "User" WHERE email = $1 LIMIT 1',
      [EMAIL]
    );

    const existing = existingRes.rows[0] as { id: string; email: string } | undefined;

    if (!existing) {
      console.log(`User not found: ${EMAIL}`);
      process.exit(1);
    }

    const hashed = await bcrypt.hash(PASSWORD, 12);

    const columnsRes = await client.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User'
      `
    );

    const columns = new Set(columnsRes.rows.map((row: { column_name: string }) => row.column_name));

    const setParts: string[] = ['role = $1', 'password = $2'];
    const values: Array<string | boolean | null> = ["ADMIN", hashed];

    if (columns.has("isBurned")) {
      setParts.push(`"isBurned" = $${values.length + 1}`);
      values.push(false);
    }

    if (columns.has("burnedAt")) {
      setParts.push(`"burnedAt" = $${values.length + 1}`);
      values.push(null);
    }

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

    const userRes = await client.query(
      'SELECT id, email, role, password, "isBurned" FROM "User" WHERE id = $1 LIMIT 1',
      [existing.id]
    );

    const user = userRes.rows[0] as {
      id: string;
      email: string;
      role: string;
      password: string;
      isBurned?: boolean;
    } | undefined;

    if (!user) {
      console.log("User disappeared after update.");
      process.exit(1);
    }

    const passwordMatches = await bcrypt.compare(PASSWORD, user.password);

    console.log(
      JSON.stringify(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          isBurned: Boolean(user.isBurned),
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
