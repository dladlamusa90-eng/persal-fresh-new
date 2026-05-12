import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import {
  FIRST_TIME_MAX_LOAN,
  MIN_LOAN_AMOUNT,
  getDisposableIncomeEligibility,
} from "@/lib/loanPolicy";
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
    const body = (await req.json()) as {
      fullName?: string;
      email?: string;
      amount?: number;
      termDays?: number;
      grossSalary?: number;
      disposableIncome?: number;
      phone?: string;
      idNumber?: string;
      persalNumber?: string;
      bankName?: string;
      accountNumber?: string;
      accountType?: string;
      branchCode?: string;
      debitMandateAccepted?: boolean;
    };

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const amount = Number(body.amount);
    const termDays = Number(body.termDays);
    const grossSalary = Number(body.grossSalary);
    const disposableIncome = Number(body.disposableIncome);
    const phone = normalizePhoneNumber(String(body.phone ?? "").trim());
    const idNumber = normalizeIdNumber(String(body.idNumber ?? "").trim());
    const persalNumber = normalizePersalNumber(String(body.persalNumber ?? "").trim());
    const bankName = String(body.bankName ?? "").trim();
    const accountNumber = normalizeAccountNumber(String(body.accountNumber ?? "").trim());
    const accountType = String(body.accountType ?? "CHEQUE").trim().toUpperCase();
    const branchCode = String(body.branchCode ?? "").trim();
    const debitMandateAccepted = Boolean(body.debitMandateAccepted);

    // ── Basic validation ──────────────────────────────────────────────────
    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!Number.isFinite(amount) || !Number.isFinite(termDays)) {
      return NextResponse.json({ error: "Invalid loan details." }, { status: 400 });
    }

    if (!Number.isFinite(grossSalary) || grossSalary <= 0) {
      return NextResponse.json({ error: "Please enter your gross monthly salary." }, { status: 400 });
    }

    if (!Number.isFinite(disposableIncome) || disposableIncome < 0 || disposableIncome > grossSalary) {
      return NextResponse.json({ error: "Please enter valid disposable income." }, { status: 400 });
    }

    if (amount < MIN_LOAN_AMOUNT || amount > FIRST_TIME_MAX_LOAN) {
      return NextResponse.json(
        { error: `Loan amount must be between R${MIN_LOAN_AMOUNT} and R${FIRST_TIME_MAX_LOAN.toLocaleString()}.` },
        { status: 400 }
      );
    }

    if (![30, 60, 90].includes(termDays)) {
      return NextResponse.json({ error: "Loan term must be 30, 60, or 90 days." }, { status: 400 });
    }

    if (!isSouthAfricanPhoneNumber(phone)) {
      return NextResponse.json({ error: "Please enter a valid South African phone number." }, { status: 400 });
    }

    if (!isSouthAfricanIdNumber(idNumber)) {
      return NextResponse.json({ error: "Please enter a valid South African ID number." }, { status: 400 });
    }

    if (!isValidPersalNumber(persalNumber)) {
      return NextResponse.json({ error: "Persal number must be exactly 8 digits." }, { status: 400 });
    }

    if (!isSouthAfricanBankName(bankName)) {
      return NextResponse.json({ error: "Please select a valid South African bank." }, { status: 400 });
    }

    if (!isValidBankAccountNumber(bankName, accountNumber)) {
      return NextResponse.json(
        { error: `Account number for ${bankName} must be ${getBankAccountConstraintLabel(bankName)}.` },
        { status: 400 }
      );
    }

    if (!isValidBankAccountType(accountType)) {
      return NextResponse.json({ error: "Account type must be Cheque, Savings, or Transmission." }, { status: 400 });
    }

    if (!isValidBranchCode(branchCode)) {
      return NextResponse.json({ error: "Branch code must be exactly 6 digits." }, { status: 400 });
    }

    if (!debitMandateAccepted) {
      return NextResponse.json({ error: "You must accept the debit mandate to apply." }, { status: 400 });
    }

    // Affordability check (non-blocking — admin can override)
    if (disposableIncome >= 1000) {
      const affordability = getDisposableIncomeEligibility(disposableIncome, amount, FIRST_TIME_MAX_LOAN);
      if (!affordability.eligible) {
        return NextResponse.json(
          {
            error: `Loan amount exceeds affordability limit. Maximum allowed is R${affordability.maxAllowed.toLocaleString()} (25% of disposable income).`,
          },
          { status: 400 }
        );
      }
    }

    // ── Resolve or create user ────────────────────────────────────────────
    let userId: string;
    let isNewUser = false;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isBurned: true, isDeleted: true },
    });

    if (existingUser) {
      if (existingUser.isBurned || existingUser.isDeleted) {
        return NextResponse.json(
          { error: "Your account is not eligible to apply. Please contact support." },
          { status: 403 }
        );
      }

      // Check if existing user already has an active or pending loan
      const activeLoan = await prisma.loan.findFirst({
        where: { userId: existingUser.id, status: { in: ["APPROVED", "PENDING"] } },
        select: { id: true, status: true },
      });

      if (activeLoan) {
        if (activeLoan.status === "APPROVED") {
          return NextResponse.json(
            { error: "You already have an active loan. Please settle it before applying again." },
            { status: 409 }
          );
        }
        // Cancel pending loan before creating a new one
        await prisma.loan.update({
          where: { id: activeLoan.id },
          data: { status: "REJECTED", rejectionReason: "Replaced by a new application" },
        });
      }

      userId = existingUser.id;
    } else {
      // Auto-create account for guest applicant
      const tempPassword = randomBytes(12).toString("hex");
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Handle unique Persal constraint — wrap in try/catch
      try {
        const newUser = await prisma.user.create({
          data: {
            fullName,
            email,
            password: hashedPassword,
            phone,
            idNumber,
            persalNumber: persalNumber || null,
            bankName,
            accountNumber,
            accountType: isValidBankAccountType(accountType)
              ? (accountType as "CHEQUE" | "SAVINGS" | "TRANSMISSION")
              : "CHEQUE",
            branchCode,
            // Guest applicants skip the account-review step — their loan is reviewed instead
            applicationStatus: "APPROVED",
            applicationApprovedAt: new Date(),
          },
        });
        userId = newUser.id;
        isNewUser = true;
      } catch (err: unknown) {
        const e = err as { code?: string; meta?: { target?: string[] } };
        if (e?.code === "P2002") {
          const field = e?.meta?.target?.[0];
          if (field === "persalNumber") {
            return NextResponse.json(
              { error: "A Persal number is already registered. If this is your account, please sign in instead." },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in to apply." },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    // ── Create loan ───────────────────────────────────────────────────────
    const now = new Date();
    const mandateReference = `DM-${now.getTime()}-${userId.slice(0, 6)}`;

    const loan = await prisma.loan.create({
      data: {
        userId,
        amount,
        termDays,
        grossSalary,
        disposableIncome,
        applicantFullName: fullName,
        applicantEmail: email,
        applicantPhone: phone,
        applicantIdNumber: idNumber,
        applicantPersalNumber: persalNumber || null,
        applicantBankName: bankName,
        applicantAccountNumber: accountNumber,
        applicantAccountType: isValidBankAccountType(accountType)
          ? (accountType as "CHEQUE" | "SAVINGS" | "TRANSMISSION")
          : "CHEQUE",
        applicantBranchCode: branchCode,
        debitMandateAccepted,
        debitMandateAcceptedAt: debitMandateAccepted ? now : null,
        debitMandateReference: debitMandateAccepted ? mandateReference : null,
        status: "PENDING",
      },
      select: { id: true },
    });

    return NextResponse.json(
      {
        message: "Application submitted successfully.",
        applicationId: loan.id,
        isNewUser,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[guest/loan-apply] error", err);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
