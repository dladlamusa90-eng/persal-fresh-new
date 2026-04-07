import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { calculatePointsForRepayment } from "@/lib/loanPolicy";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: session.user.id
        ? { id: session.user.id }
        : { email: String(session.user.email ?? "") },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prismaClient = prisma as any;

    let events: Array<{
      id: string;
      type: "ON_TIME_REPAYMENT" | "ADMIN_ADJUSTMENT";
      pointsDelta: number;
      balanceAfter: number;
      description: string | null;
      createdAt: Date;
    }> = [];

    try {
      events = await prismaClient.userPointsEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          type: true,
          pointsDelta: true,
          balanceAfter: true,
          description: true,
          createdAt: true,
        },
      });
    } catch {
      events = [];
    }

    if (events.length === 0) {
      const [userWithPoints, paidLoans] = await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: { points: true },
        }),
        prisma.loan.findMany({
          where: { userId: user.id, status: "PAID" },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, createdAt: true, amount: true },
        }),
      ]);

      const currentPoints = userWithPoints?.points ?? 0;
      if (currentPoints > 0 && paidLoans.length > 0) {
        let runningBalance = currentPoints;

        events = paidLoans.map((loan) => {
          const inferredPoints = calculatePointsForRepayment(loan.amount);
          const event = {
            id: `legacy-${loan.id}`,
            type: "ON_TIME_REPAYMENT" as const,
            pointsDelta: inferredPoints,
            balanceAfter: runningBalance,
            description: "On-time repayment reward (inferred)",
            createdAt: loan.createdAt,
          };
          runningBalance = Math.max(0, runningBalance - inferredPoints);
          return event;
        });
      }
    }

    return NextResponse.json({ events }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
