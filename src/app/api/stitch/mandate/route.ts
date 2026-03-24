import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { bankNameToStitchId, createDebiCheckMandate } from "@/lib/stitch";
import { calculateLoanCharges } from "@/lib/loanPolicy";

/**
 * POST /api/stitch/mandate
 * Creates a DebiCheck debit order mandate for an approved loan.
 * Admin only. Body: { loanId: string }
 *
 * The mandate is sent to the debtor's bank for authentication.
 * The mandate ID and status are stored on the Loan record.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const loanId = String(body?.loanId ?? "").trim();
    if (!loanId) {
      return NextResponse.json({ error: "loanId is required" }, { status: 400 });
    }

    const loan = await (prisma.loan.findUnique as Function)({
      where: { id: loanId },
      include: { user: true },
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    if (loan.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Mandates can only be created for approved loans" },
        { status: 409 }
      );
    }
    if (loan.stitchMandateId) {
      return NextResponse.json(
        { error: "A mandate has already been created for this loan" },
        { status: 409 }
      );
    }

    const user = loan.user;
    if (!user.accountNumber || !user.bankName || !user.idNumber) {
      return NextResponse.json(
        { error: "User is missing required bank account details" },
        { status: 422 }
      );
    }

    // First collection: 30 days from disbursement (or now)
    const baseDate = loan.disbursementSentAt ?? new Date();
    const firstCollection = new Date(baseDate);
    firstCollection.setDate(firstCollection.getDate() + 30);
    const firstCollectionDate = firstCollection.toISOString().slice(0, 10);

    const { totalRepayable } = calculateLoanCharges(loan.amount, loan.termDays);
    const amountCents = Math.round(totalRepayable * 100);

    const mandate = await createDebiCheckMandate({
      debtorAccountNumber: user.accountNumber,
      debtorBranchCode: user.branchCode ?? "000000",
      debtorBankId: bankNameToStitchId(user.bankName),
      debtorAccountType: user.accountType ?? "SAVINGS",
      debtorName: user.fullName,
      debtorIdNumber: user.idNumber,
      amountCents,
      collectionDay: firstCollection.getDate(),
      firstCollectionDate,
      merchantReference: `PERSAL-${loanId.slice(0, 8)}-${Date.now()}`,
    });

    await (prisma.loan.update as Function)({
      where: { id: loanId },
      data: {
        stitchMandateId: mandate.id,
        stitchMandateStatus: mandate.status,
      },
    });

    console.info("[audit] stitch-mandate-created", {
      actorUserId: session.user.id,
      loanId,
      mandateId: mandate.id,
      mandateStatus: mandate.status,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ mandate }, { status: 201 });
  } catch (err) {
    console.error("[stitch] mandate creation error:", err);
    return NextResponse.json({ error: "Failed to create debit mandate" }, { status: 500 });
  }
}
