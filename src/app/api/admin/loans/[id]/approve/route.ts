import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { formatRand, sendSystemNotification } from "@/lib/systemNotifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Loan id is required" }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
      },
    });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (loan.status !== "PENDING") {
      const wasOverriddenByUser =
        loan.status === "REJECTED" &&
        loan.rejectionReason === "Cancelled and replaced by a newer application";

      return NextResponse.json(
        {
          error: wasOverriddenByUser
            ? "This application was just overridden by the user and is no longer available for approval."
            : "Only pending loans can be approved",
          code: wasOverriddenByUser ? "APPLICATION_OVERRIDDEN" : "LOAN_NOT_PENDING",
        },
        { status: 409 }
      );
    }

    const approveResult = await prisma.loan.updateMany({
      where: {
        id,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
        rejectionReason: null,
      },
    });

    if (approveResult.count === 0) {
      const latestLoan = await prisma.loan.findUnique({
        where: { id },
        select: {
          status: true,
          rejectionReason: true,
        },
      });

      const wasOverriddenByUser =
        latestLoan?.status === "REJECTED" &&
        latestLoan.rejectionReason === "Cancelled and replaced by a newer application";

      return NextResponse.json(
        {
          error: wasOverriddenByUser
            ? "This application was just overridden by the user and is no longer available for approval."
            : "Only pending loans can be approved",
          code: wasOverriddenByUser ? "APPLICATION_OVERRIDDEN" : "LOAN_NOT_PENDING",
        },
        { status: 409 }
      );
    }

    const updatedLoan = (await prisma.loan.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        amount: true,
        termDays: true,
        userId: true,
        createdAt: true,
        disbursementSentAt: true,
        disbursementReference: true,
        disbursementMode: true,
      } as any,
    })) as any;

    if (!updatedLoan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    console.info("[audit] admin-loan-approve", {
      actorUserId: session.user.id,
      loanId: id,
      userId: updatedLoan.userId,
      at: new Date().toISOString(),
    });

    // Automatic notification: loan approved, awaiting disbursement
    void sendSystemNotification(
      updatedLoan.userId,
      "Loan Approved — Awaiting Disbursement",
      `Great news! Your loan application for ${formatRand(updatedLoan.amount)} has been approved. Funds will be disbursed to your account shortly. You will be notified once the transfer has been made.`
    );

    return NextResponse.json(
      {
        message: "Loan approved. Continue to transfer funds to the applicant.",
        loan: updatedLoan,
        transferUrl: `/admin/loans/${id}/transfer`,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
