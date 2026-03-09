const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const emails = process.argv.slice(2).map((email) => email.toLowerCase().trim()).filter(Boolean);

async function main() {
  if (emails.length === 0) {
    console.error("Usage: node scripts/set-admin.js user1@email.com user2@email.com");
    process.exit(1);
  }

  const updated = await prisma.user.updateMany({
    where: {
      email: {
        in: emails,
      },
    },
    data: {
      role: "ADMIN",
    },
  });

  const admins = await prisma.user.findMany({
    where: {
      email: {
        in: emails,
      },
    },
    select: {
      email: true,
      fullName: true,
      role: true,
    },
  });

  console.log(`Updated ${updated.count} user(s) to ADMIN.`);
  console.log(JSON.stringify(admins, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
