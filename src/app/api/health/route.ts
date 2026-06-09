import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.DATABASE_URL = process.env.DATABASE_URL ? "set" : "MISSING";
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "set" : "MISSING";
  checks.NODE_ENV = process.env.NODE_ENV ?? "unknown";

  // Check Prisma
  try {
    const prisma = (await import("@/lib/prisma")).default;
    const count = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "User"`;
    checks.prisma = `ok (${count[0].count} users)`;
  } catch (e) {
    checks.prisma = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Check bcryptjs
  try {
    const { hash } = await import("@/lib/bcrypt");
    await hash("test");
    checks.bcrypt = "ok";
  } catch (e) {
    checks.bcrypt = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(checks);
}
