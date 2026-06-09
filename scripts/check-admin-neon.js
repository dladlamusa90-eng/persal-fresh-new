const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://neondb_owner:npg_lNZ0twSFhrX6@ep-shy-block-aq42wack.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" } },
});
prisma.user
  .findUnique({ where: { email: "admin@persal.co.za" }, select: { id: true, email: true, role: true, isBurned: true, isDeleted: true } })
  .then((u) => { console.log(u ? JSON.stringify(u) : "NOT FOUND"); prisma.$disconnect(); })
  .catch((e) => { console.error("ERROR:", e.message); prisma.$disconnect(); });
