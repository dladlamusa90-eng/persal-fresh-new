import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const TARGET_USERS = [
  { email: "sinenhlanhlamusa9@gmail.com", password: "User@12345" },
  { email: "admin@persal.co.za", password: "Admin@12345" },
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    for (const user of TARGET_USERS) {
      const exists = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, email: true },
      });

      if (!exists) {
        console.log(`User not found, skipped: ${user.email}`);
        continue;
      }

      const hashed = await bcrypt.hash(user.password, 12);
      await prisma.user.update({
        where: { email: user.email },
        data: { password: hashed },
      });

      console.log(`Password reset: ${user.email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
