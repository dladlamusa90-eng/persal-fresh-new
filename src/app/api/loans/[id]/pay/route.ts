import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { calculateLoanCharges, calculatePointsForRepayment, getTermEndDate } from "@/lib/loanPolicy";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Loan id is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        amount: true,
        termDays: true,
        status: true,
        createdAt: true,
      },
    });

    if (!loan || loan.userId !== user.id) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (loan.status === "PAID") {
      return NextResponse.json({ error: "Loan is already paid" }, { status: 409 });
    }

    if (loan.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved loans can be paid" },
        { status: 409 }
      );
    }

    const now = new Date();
    const firstMonthDate = getTermEndDate(loan.createdAt, 30);
    const fullDueDate = getTermEndDate(loan.createdAt, loan.termDays);

    const earlyPayment = now < firstMonthDate;
    const paidOnTime = now <= fullDueDate;
    const pointsAwarded = paidOnTime ? calculatePointsForRepayment(loan.amount) : 0;

    const firstMonthRepayable = calculateLoanCharges(loan.amount, 30).totalRepayable;
    const fullRepayable = calculateLoanCharges(loan.amount, loan.termDays).totalRepayable;
    const amountPaid = earlyPayment ? firstMonthRepayable : fullRepayable;

    const { updatedLoan, updatedUser } = await prisma.$transaction(async (tx) => {
      const paidLoan = await tx.loan.update({
        where: { id: loan.id },
        data: { status: "PAID" },
        select: {
          id: true,
          status: true,
          amount: true,
          termDays: true,
          createdAt: true,
        },
      });

      const pointsUser = paidOnTime
        ? await tx.user.update({
            where: { id: user.id },
            data: { points: { increment: pointsAwarded } },
            select: { points: true },
          })
        : await tx.user.findUnique({
            where: { id: user.id },
            select: { points: true },
          });

      if (paidOnTime && pointsUser) {
        try {
          await tx.userPointsEvent.create({
            data: {
              userId: user.id,
              type: "ON_TIME_REPAYMENT",
              pointsDelta: pointsAwarded,
              balanceAfter: pointsUser.points,
              description: "On-time loan repayment reward",
              loanId: loan.id,
            },
          });
        } catch (eventError) {
          console.warn("[warn] points-event-log-failed", {
            userId: user.id,
            loanId: loan.id,
            at: new Date().toISOString(),
            error: eventError instanceof Error ? eventError.message : "unknown",
          });
        }
      }

      return {
        updatedLoan: paidLoan,
        updatedUser: pointsUser,
      };
    });

    console.info("[audit] user-loan-payment", {
      userId: user.id,
      loanId: loan.id,
      earlyPayment,
      paidOnTime,
      pointsAwarded,
      amountPaid,
      at: now.toISOString(),
    });

    return NextResponse.json(
      {
        message: "Loan payment recorded (test mode, no real money transfer)",
        loan: updatedLoan,
        payment: {
          earlyPayment,
          paidOnTime,
          amountPaid,
          fullDueDate: fullDueDate.toISOString(),
          firstMonthDate: firstMonthDate.toISOString(),
        },
        pointsAwarded,
        userPoints: updatedUser?.points ?? 0,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}