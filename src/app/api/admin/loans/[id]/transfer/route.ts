import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await req.json()) as { amount?: number; reference?: string; mode?: string };
    const amount = Number(body.amount);
    const reference = String(body.reference ?? "").trim();
    const mode = String(body.mode ?? "MANUAL_TRANSFER").trim() || "MANUAL_TRANSFER";

    if (!id) {
      return NextResponse.json({ error: "Loan id is required" }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        amount: true,
        userId: true,
        disbursementSentAt: true,
      },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (loan.status !== "APPROVED") {
      return NextResponse.json({ error: "Only approved loans can be transferred" }, { status: 409 });
    }

    if (loan.disbursementSentAt) {
      return NextResponse.json({ error: "Loan transfer has already been recorded" }, { status: 409 });
    }

    if (!Number.isFinite(amount) || amount !== loan.amount) {
      return NextResponse.json({ error: "Transfer amount must match the approved loan amount exactly" }, { status: 400 });
    }

    const transferReference = reference || `TRF-${Date.now()}-${loan.userId.slice(0, 6)}`;
    const transferredAt = new Date();

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        disbursementSentAt: transferredAt,
        disbursementReference: transferReference,
        disbursementMode: mode,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        disbursementSentAt: true,
        disbursementReference: true,
        disbursementMode: true,
        userId: true,
      },
    });

    console.info("[audit] admin-loan-transfer", {
      actorUserId: session.user.id,
      loanId: id,
      userId: updatedLoan.userId,
      amount: updatedLoan.amount,
      reference: updatedLoan.disbursementReference,
      mode: updatedLoan.disbursementMode,
      transferredAt: updatedLoan.disbursementSentAt?.toISOString(),
    });

    return NextResponse.json({ message: "Loan transfer recorded", loan: updatedLoan }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}