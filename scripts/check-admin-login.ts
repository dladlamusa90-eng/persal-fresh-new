import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = "admin@persal.co.za";
const TEST_PASSWORD = "Admin@12345";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    let user: {
      id: string;
      email: string;
      role: string;
      password: string;
      isBurned: boolean;
      isDeleted: boolean;
    } | null = null;

    try {
      user = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL },
        select: {
          id: true,
          email: true,
          role: true,
          password: true,
          isBurned: true,
          isDeleted: true,
        } as any,
      }) as any;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.toLowerCase().includes("isdeleted")) {
        throw error;
      }

      const legacyUser = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL },
        select: {
          id: true,
          email: true,
          role: true,
          password: true,
          isBurned: true,
        },
      });

      user = legacyUser
        ? {
            ...legacyUser,
            isDeleted: false,
          }
        : null;
    }

    if (!user) {
      console.log("Admin user not found");
      process.exit(1);
    }

    const isBcryptFormat = user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$");
    const bcryptMatch = await bcrypt.compare(TEST_PASSWORD, user.password);
    const plaintextMatch = user.password === TEST_PASSWORD;

    console.log(
      JSON.stringify(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          isBurned: user.isBurned,
          isDeleted: user.isDeleted,
          passwordPrefix: user.password.slice(0, 4),
          isBcryptFormat,
          bcryptMatch,
          plaintextMatch,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
