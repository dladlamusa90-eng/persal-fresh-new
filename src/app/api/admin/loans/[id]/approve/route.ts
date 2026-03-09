import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

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

    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (loan.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending loans can be approved" },
        { status: 409 }
      );
    }

    const disbursementReference = `DSB-${Date.now()}-${loan.userId.slice(0, 6)}`;
    const disbursedAt = new Date();

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        status: "APPROVED",
        rejectionReason: null,
        disbursementSentAt: disbursedAt,
        disbursementReference,
        disbursementMode: "AUTO_TEST_TRANSFER",
      } as any,
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
    }) as any;

    console.info("[audit] admin-loan-approve", {
      actorUserId: session.user.id,
      loanId: id,
      userId: updatedLoan.userId,
      at: new Date().toISOString(),
    });

    console.info("[audit] loan-auto-disbursement", {
      actorUserId: session.user.id,
      loanId: id,
      userId: updatedLoan.userId,
      amount: updatedLoan.amount,
      mode: updatedLoan.disbursementMode,
      disbursedAt: updatedLoan.disbursementSentAt?.toISOString(),
      disbursementReference: updatedLoan.disbursementReference,
    });

    return NextResponse.json(
      {
        message: "Loan approved and money sent automatically (test mode, no real money transfer).",
        loan: updatedLoan,
        disbursement: {
          sent: true,
          sentAt: updatedLoan.disbursementSentAt,
          mode: updatedLoan.disbursementMode,
          reference: updatedLoan.disbursementReference,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
