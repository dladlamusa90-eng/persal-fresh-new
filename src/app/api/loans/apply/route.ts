import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { ALLOWED_TERM_DAYS, FIRST_TIME_MAX_LOAN, MIN_LOAN_AMOUNT, RETURNING_MAX_LOAN, getMaxLoanForUser } from "@/lib/loanPolicy";
import {
  getBankAccountConstraintLabel,
  isSouthAfricanBankName,
  isSouthAfricanIdNumber,
  isSouthAfricanPhoneNumber,
  isValidBankAccountNumber,
  isValidBankAccountType,
  isValidBranchCode,
  isValidPersalNumber,
  normalizeAccountNumber,
  normalizeIdNumber,
  normalizePersalNumber,
  normalizePhoneNumber,
} from "@/lib/validators/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "ADMIN") {
      return NextResponse.json({ error: "Admins cannot apply for loans" }, { status: 403 });
    }

    const body = (await req.json()) as {
      amount?: number;
      termDays?: number;
      phone?: string;
      idNumber?: string;
      persalNumber?: string;
      bankName?: string;
      accountNumber?: string;
      accountType?: string;
      branchCode?: string;
      debitMandateAccepted?: boolean;
    };
    const amount = Number(body.amount);
    const termDays = Number(body.termDays);

    const phone = normalizePhoneNumber(String(body.phone ?? "").trim());
    const idNumber = normalizeIdNumber(String(body.idNumber ?? "").trim());
    const persalNumber = normalizePersalNumber(String(body.persalNumber ?? "").trim());
    const bankName = String(body.bankName ?? "").trim();
    const accountNumber = normalizeAccountNumber(String(body.accountNumber ?? "").trim());
    const accountType = String(body.accountType ?? "").trim().toUpperCase();
    const branchCode = String(body.branchCode ?? "").trim();
    const debitMandateAccepted = Boolean(body.debitMandateAccepted);

    if (!Number.isFinite(amount) || !Number.isFinite(termDays)) {
      return NextResponse.json({ error: "Invalid loan payload" }, { status: 400 });
    }

    if (!phone || !idNumber || !persalNumber || !bankName || !accountNumber || !accountType || !branchCode) {
      return NextResponse.json(
        { error: "All debit and banking details are required for loan requests." },
        { status: 400 }
      );
    }

    if (!debitMandateAccepted) {
      return NextResponse.json({ error: "You must accept the debit mandate to continue." }, { status: 400 });
    }

    if (!isSouthAfricanPhoneNumber(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid South African phone number." },
        { status: 400 }
      );
    }

    if (!isSouthAfricanIdNumber(idNumber)) {
      return NextResponse.json({ error: "Please enter a valid South African ID Number." }, { status: 400 });
    }

    if (!isValidPersalNumber(persalNumber)) {
      return NextResponse.json({ error: "Persal Number must be exactly 8 digits." }, { status: 400 });
    }

    if (!isSouthAfricanBankName(bankName)) {
      return NextResponse.json({ error: "Please select a valid South African bank." }, { status: 400 });
    }

    if (!isValidBankAccountNumber(bankName, accountNumber)) {
      return NextResponse.json(
        { error: `Account Number for ${bankName} must be ${getBankAccountConstraintLabel(bankName)}.` },
        { status: 400 }
      );
    }

    if (!isValidBankAccountType(accountType)) {
      return NextResponse.json(
        { error: "Account type must be Cheque, Savings, or Transmission." },
        { status: 400 }
      );
    }

    if (!isValidBranchCode(branchCode)) {
      return NextResponse.json({ error: "Branch code must be exactly 6 digits." }, { status: 400 });
    }

    if (!ALLOWED_TERM_DAYS.includes(termDays as (typeof ALLOWED_TERM_DAYS)[number])) {
      return NextResponse.json({ error: "Loan term must be 30, 60, or 90 days" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, isBurned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isBurned) {
      return NextResponse.json(
        { error: "Your account has been blocked from using Persal" },
        { status: 403 }
      );
    }

    const openLoan = await prisma.loan.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
      select: { id: true },
    });

    if (openLoan) {
      return NextResponse.json(
        { error: "You already have an active or pending loan" },
        { status: 409 }
      );
    }

    const previousLoanCount = await prisma.loan.count({
      where: { userId: user.id },
    });

    const isReturningUser = previousLoanCount > 0;
    const maxAllowed = getMaxLoanForUser(isReturningUser);

    if (amount < MIN_LOAN_AMOUNT || amount > maxAllowed) {
      return NextResponse.json(
        {
          error: isReturningUser
            ? `Loan amount must be between R${MIN_LOAN_AMOUNT} and R${RETURNING_MAX_LOAN.toLocaleString()}`
            : `Loan amount must be between R${MIN_LOAN_AMOUNT} and R${FIRST_TIME_MAX_LOAN.toLocaleString()} for first-time users`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const mandateReference = `DM-${now.getTime()}-${user.id.slice(0, 6)}`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        idNumber,
        persalNumber,
        bankName,
        accountNumber,
        accountType: accountType as "CHEQUE" | "SAVINGS" | "TRANSMISSION",
        branchCode,
      },
    });

    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        amount,
        termDays,
        status: "PENDING",
        debitMandateAccepted: true,
        debitMandateAcceptedAt: now,
        debitMandateReference: mandateReference,
      },
      select: {
        id: true,
        amount: true,
        termDays: true,
        status: true,
        createdAt: true,
        debitMandateReference: true,
      },
    });

    console.info("[audit] debit-mandate-captured", {
      userId: user.id,
      loanId: loan.id,
      mandateReference,
      ipAddress,
      at: now.toISOString(),
    });

    return NextResponse.json({ message: "Loan application submitted", loan }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}