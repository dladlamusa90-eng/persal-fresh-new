import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = "admin@persal.co.za";
const ADMIN_FULL_NAME = "System Administrator";
const ADMIN_PASSWORD = "Admin@12345";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: ADMIN_EMAIL,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (existingUser) {
      if (existingUser.email === ADMIN_EMAIL && existingUser.role === "ADMIN") {
        console.log("Admin user already exists. No duplicate created.");
        process.exit(0);
      }

      console.log("A user with this email already exists and is not ADMIN. No changes were made.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const adminUser = await prisma.user.create({
      data: {
        fullName: ADMIN_FULL_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "ADMIN",
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log("Admin created successfully:", adminUser);
    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
