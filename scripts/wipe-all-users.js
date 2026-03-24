const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    await prisma.$transaction([
      prisma.loginOtp.deleteMany({}),
      prisma.passwordResetOtp.deleteMany({}),
      prisma.loan.deleteMany({}),
      prisma.user.deleteMany({}),
    ]);

    const counts = {
      users: await prisma.user.count(),
      loans: await prisma.loan.count(),
      loginOtps: await prisma.loginOtp.count(),
      passwordResetOtps: await prisma.passwordResetOtp.count(),
    };

    console.log(JSON.stringify({ message: "All users/admins removed", counts }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
