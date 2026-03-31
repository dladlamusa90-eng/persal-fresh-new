import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [latestLoan, loanCount] = await Promise.all([
      prisma.loan.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          termDays: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
          disbursementSentAt: true,
          disbursementReference: true,
        },
      }),
      prisma.loan.count({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json(
      {
        latestLoan,
        loanCount,
        isReturningUser: loanCount > 0,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}