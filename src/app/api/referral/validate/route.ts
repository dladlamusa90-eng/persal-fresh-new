import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code || code.length < 4) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const session = await getServerSession(authOptions);

  const rows = await prisma.$queryRaw<{ id: string; fullName: string }[]>`
    SELECT id, "fullName"
    FROM "User"
    WHERE "referralCode" = ${code}
      AND "isBurned" = false
      AND "isDeleted" = false
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json({ valid: false });
  }

  const referrer = rows[0];

  // Prevent self-referral
  if (session?.user?.id && referrer.id === session.user.id) {
    return NextResponse.json({ valid: false, reason: "self" });
  }

  const firstName = referrer.fullName.split(" ")[0];
  return NextResponse.json({ valid: true, referrerName: firstName });
}
