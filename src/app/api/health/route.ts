import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  checks.DATABASE_URL = process.env.DATABASE_URL ? "set" : "MISSING";
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "set" : "MISSING";
  checks.NODE_ENV = process.env.NODE_ENV ?? "unknown";

  try {
    const prisma = (await import("@/lib/prisma")).default;
    const count = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "User"`;
    checks.prisma = `ok (${count[0].count} users)`;

    // Test a join query (same as admin page)
    try {
      const loans = await prisma.loan.findMany({ take: 1, include: { user: { select: { email: true } } } });
      checks.loanJoin = `ok (${loans.length} rows)`;
    } catch (e) {
      checks.loanJoin = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Test user findMany with where
    try {
      const users = await prisma.user.findMany({ take: 1, select: { id: true, email: true, role: true } });
      checks.userSelect = `ok (${users.length} rows)`;
    } catch (e) {
      checks.userSelect = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  } catch (e) {
    checks.prisma = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  try {
    const { hash } = await import("@/lib/bcrypt");
    await hash("test");
    checks.bcrypt = "ok";
  } catch (e) {
    checks.bcrypt = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks);
}
