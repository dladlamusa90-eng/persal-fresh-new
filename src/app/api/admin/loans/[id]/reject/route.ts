import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { isValidLoanRejectionReason } from "@/lib/loanRejectionReasons";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
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

    const body = (await req.json()) as { reason?: string };
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    if (!isValidLoanRejectionReason(reason)) {
      return NextResponse.json(
        { error: "Invalid rejection reason" },
        { status: 400 }
      );
    }

    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (loan.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending loans can be rejected" },
        { status: 409 }
      );
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: { status: "REJECTED", rejectionReason: reason },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        amount: true,
        termDays: true,
        userId: true,
        createdAt: true,
      },
    });

    console.info("[audit] admin-loan-reject", {
      actorUserId: session.user.id,
      loanId: id,
      userId: updatedLoan.userId,
      reason,
      at: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: "Loan rejected", loan: updatedLoan },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
