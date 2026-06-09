const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const bcrypt = require("bcryptjs");

const adapter = new PrismaNeon({
  connectionString: "postgresql://neondb_owner:npg_lNZ0twSFhrX6@ep-shy-block-aq42wack.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "admin@persal.co.za" } });
  if (existing) {
    // Update password and ensure ADMIN role
    const hashed = await bcrypt.hash("Admin@12345", 12);
    await prisma.user.update({
      where: { email: "admin@persal.co.za" },
      data: { password: hashed, role: "ADMIN" },
    });
    console.log("Admin account updated:", existing.email, "role:", "ADMIN");
  } else {
    const hashed = await bcrypt.hash("Admin@12345", 12);
    const admin = await prisma.user.create({
      data: {
        fullName: "Admin User",
        email: "admin@persal.co.za",
        password: hashed,
        role: "ADMIN",
        persalNumber: null,
        idNumber: "0000000000000",
        phone: "0000000000",
      },
    });
    console.log("Admin account created:", admin.email, "id:", admin.id);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error("ERROR:", e.message); prisma.$disconnect(); process.exit(1); });
