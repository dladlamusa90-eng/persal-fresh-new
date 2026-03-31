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

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        status: "APPROVED",
        rejectionReason: null,
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
