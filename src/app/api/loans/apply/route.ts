import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { formatRand, sendSystemNotification } from "@/lib/systemNotifications";
import {
  ALLOWED_TERM_DAYS,
  FIRST_TIME_MAX_LOAN,
  MIN_LOAN_AMOUNT,
  RETURNING_MAX_LOAN,
  getDisposableIncomeEligibility,
  getMaxLoanForUser,
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
    const amount = Number(body.amount);
    const termDays = Number(body.termDays);
    const grossSalary = Number(body.grossSalary);
    const disposableIncome = Number(body.disposableIncome);

    const phone = normalizePhoneNumber(String(body.phone ?? "").trim());
    const idNumber = normalizeIdNumber(String(body.idNumber ?? "").trim());
    const persalNumber = normalizePersalNumber(String(body.persalNumber ?? "").trim());
    const bankName = String(body.bankName ?? "").trim();
    const accountNumber = normalizeAccountNumber(String(body.accountNumber ?? "").trim());
    const accountType = String(body.accountType ?? "").trim().toUpperCase();
    const branchCode = String(body.branchCode ?? "").trim();
    const debitMandateAccepted = Boolean(body.debitMandateAccepted);

    if (!Number.isFinite(amount) || !Number.isFinite(termDays) || !Number.isFinite(grossSalary) || !Number.isFinite(disposableIncome)) {
      return NextResponse.json({ error: "Invalid loan payload" }, { status: 400 });
    }

    if (grossSalary <= 0 || disposableIncome < 0 || disposableIncome > grossSalary) {
      return NextResponse.json({ error: "Invalid income details supplied." }, { status: 400 });
    }

    const hasCompleteDebitAndBankingPayload = Boolean(
      phone && idNumber && persalNumber && bankName && accountNumber && accountType && branchCode
    );

    if (hasCompleteDebitAndBankingPayload) {
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
    }

    if (!ALLOWED_TERM_DAYS.includes(termDays as (typeof ALLOWED_TERM_DAYS)[number])) {
      return NextResponse.json({ error: "Loan term must be 30, 60, or 90 days" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        isBurned: true,
        fullName: true,
        email: true,
        address: true,
        phone: true,
        idNumber: true,
        persalNumber: true,
        bankName: true,
        accountNumber: true,
        accountType: true,
        branchCode: true,
        faceIdStatus: true,
        faceIdEnrolled: true,
        faceIdRegistrationPhoto: true,
        faceIdLastLivePhoto: true,
        faceIdLastMatchPassed: true,
        faceIdLastMatchedAt: true,
        faceIdVerifiedAt: true,
        applicationStatus: true,
      } as any,
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

    // ── Application approval gate ─────────────────────────────────────────
    if ((user as any).applicationStatus === "PENDING") {
      return NextResponse.json(
        { error: "Your account application is still under review. You will be able to apply for a loan once your application is approved." },
        { status: 403 }
      );
    }

    if ((user as any).applicationStatus === "REJECTED") {
      return NextResponse.json(
        { error: "Your account application was not approved. Please contact support for assistance." },
        { status: 403 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────

    // ── FaceID verification gate ───────────────────────────────────────────
    const faceIdStatus = (user as any).faceIdStatus as string | null;
    const faceIdEnrolled = Boolean((user as any).faceIdEnrolled);
    const faceIdRegistrationPhoto = (user as any).faceIdRegistrationPhoto as string | null;
    const faceIdLastLivePhoto = (user as any).faceIdLastLivePhoto as string | null;
    const faceIdLastMatchPassed = Boolean((user as any).faceIdLastMatchPassed);
    const faceIdLastMatchedAt = (user as any).faceIdLastMatchedAt as Date | string | null;
    const FACE_MATCH_VALID_MS = 15 * 60 * 1000; // 15 minutes
    const faceMatchExpired = faceIdLastMatchedAt
      ? Date.now() - new Date(faceIdLastMatchedAt).getTime() > FACE_MATCH_VALID_MS
      : true;

    if (!faceIdEnrolled || !faceIdRegistrationPhoto) {
      return NextResponse.json(
        { error: "Face registration required. Please register your face before submitting a loan application." },
        { status: 403 }
      );
    }

    if (faceIdStatus !== "VERIFIED" || !faceIdLastLivePhoto || !faceIdLastMatchPassed || faceMatchExpired) {
      return NextResponse.json(
        {
          error:
            "Live face match required. Please complete Verify Face now so we can match your live face to your registered face before submission.",
        },
        { status: 403 }
      );
    }
    // ──────────────────────────────────────────────────────────────────────

    const applicationDraft = await prisma.loanApplicationDraft.findUnique({
      where: { userId: user.id },
      select: {
        data: true,
        documents: true,
      },
    });

    const approvedLoan = await prisma.loan.findFirst({
      where: {
        userId: user.id,
        status: "APPROVED",
      },
      select: { id: true },
    });

    if (approvedLoan) {
      return NextResponse.json(
        { error: "You already have an active or pending loan" },
        { status: 409 }
      );
    }

    // Users may submit a new application while pending; previous pending entries are cancelled.
    await prisma.loan.updateMany({
      where: {
        userId: user.id,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        rejectionReason: "Cancelled and replaced by a newer application",
      },
    });

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

    if (disposableIncome >= 1000) {
      const affordability = getDisposableIncomeEligibility(disposableIncome, amount, maxAllowed);
      if (!affordability.eligible) {
        return NextResponse.json(
          {
            error: `Loan amount exceeds affordability limit. Maximum allowed is R${affordability.maxAllowed.toLocaleString()} (25% of disposable income).`,
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const mandateReference = debitMandateAccepted
      ? `DM-${now.getTime()}-${user.id.slice(0, 6)}`
      : null;

    const resolvedPhone = phone || user.phone || null;
    const resolvedIdNumber = idNumber || user.idNumber || null;
    const resolvedPersalNumber = persalNumber || user.persalNumber || null;
    const resolvedBankName = bankName || user.bankName || null;
    const resolvedAccountNumber = accountNumber || user.accountNumber || null;
    const resolvedAccountType =
      (isValidBankAccountType(accountType)
        ? (accountType as "CHEQUE" | "SAVINGS" | "TRANSMISSION")
        : user.accountType) ?? null;
    const resolvedBranchCode = branchCode || user.branchCode || null;

    // Detect fields that differ from the user's approved application profile
    const changedFields: string[] = [];
    if (phone && phone !== user.phone) changedFields.push("phone");
    if (idNumber && idNumber !== user.idNumber) changedFields.push("ID number");
    if (persalNumber && persalNumber !== user.persalNumber) changedFields.push("Persal number");
    if (bankName && bankName !== user.bankName) changedFields.push("bank name");
    if (accountNumber && accountNumber !== user.accountNumber) changedFields.push("account number");
    if (branchCode && branchCode !== user.branchCode) changedFields.push("branch code");

    const profileUpdatePayload: {
      phone?: string;
      idNumber?: string;
      persalNumber?: string;
      bankName?: string;
      accountNumber?: string;
      accountType?: "CHEQUE" | "SAVINGS" | "TRANSMISSION";
      branchCode?: string;
    } = {};

    if (phone) profileUpdatePayload.phone = phone;
    if (idNumber) profileUpdatePayload.idNumber = idNumber;
    if (persalNumber) profileUpdatePayload.persalNumber = persalNumber;
    if (bankName) profileUpdatePayload.bankName = bankName;
    if (accountNumber) profileUpdatePayload.accountNumber = accountNumber;
    if (isValidBankAccountType(accountType)) {
      profileUpdatePayload.accountType = accountType as "CHEQUE" | "SAVINGS" | "TRANSMISSION";
    }
    if (branchCode) profileUpdatePayload.branchCode = branchCode;

    if (Object.keys(profileUpdatePayload).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: profileUpdatePayload,
      });
    }

    let loan;
    try {
      loan = await prisma.loan.create({
        data: {
          userId: user.id,
          amount,
          termDays,
          applicationData: {
            ...(((applicationDraft?.data as Record<string, unknown> | null) ?? {})),
            requestedAmount: amount,
            requestedTermDays: termDays,
            requestedGrossSalary: grossSalary,
            requestedDisposableIncome: disposableIncome,
            address: (((applicationDraft?.data as Record<string, unknown> | null) ?? {}).address as string | undefined) ?? user.address ?? null,
            phone: resolvedPhone,
            idNumber: resolvedIdNumber,
            persalNumber: resolvedPersalNumber,
            bankName: resolvedBankName,
            accountNumber: resolvedAccountNumber,
            accountType: resolvedAccountType,
            branchCode: resolvedBranchCode,
          } as Prisma.InputJsonValue,
          applicationDocuments: (((applicationDraft?.documents as Record<string, unknown> | null) ?? {}) as Prisma.InputJsonValue),
          grossSalary,
          disposableIncome,
          applicantFullName: user.fullName,
          applicantEmail: user.email,
          applicantPhone: resolvedPhone,
          applicantIdNumber: resolvedIdNumber,
          applicantPersalNumber: resolvedPersalNumber,
          applicantBankName: resolvedBankName,
          applicantAccountNumber: resolvedAccountNumber,
          applicantAccountType: resolvedAccountType,
          applicantBranchCode: resolvedBranchCode,
          faceRegistrationPhotoSnapshot: faceIdRegistrationPhoto,
          faceVerificationPhoto: faceIdLastLivePhoto,
          faceMatchPassed: true,
          faceMatchCheckedAt: faceIdLastMatchedAt ? new Date(faceIdLastMatchedAt) : now,
          status: "PENDING",
          debitMandateAccepted,
          debitMandateAcceptedAt: debitMandateAccepted ? now : null,
          debitMandateReference: mandateReference,
        },
        select: {
          id: true,
          amount: true,
          termDays: true,
          status: true,
          createdAt: true,
          grossSalary: true,
          disposableIncome: true,
          debitMandateReference: true,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("loan_one_open_per_user_idx")) {
        return NextResponse.json(
          { error: "You already have an active or pending loan" },
          { status: 409 }
        );
      }

      throw error;
    }

    console.info("[audit] debit-mandate-captured", {
      userId: user.id,
      loanId: loan.id,
      mandateReference,
      ipAddress,
      at: now.toISOString(),
    });

    // Automatic notification: loan pending
    void sendSystemNotification(
      user.id,
      "Loan Application Received",
      `Your application for ${formatRand(amount)} over ${termDays} days has been received and is currently under review. We will notify you once a decision has been made.`
    );

    // Notify all admins if the applicant submitted different details than those on their approved application
    if (changedFields.length > 0) {
      void (async () => {
        try {
          const admins = await prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
          });
          const fieldList = changedFields.join(", ");
          await Promise.all(
            admins.map((admin) =>
              sendSystemNotification(
                admin.id,
                "⚠️ Loan Application — Detail Change Detected",
                `${user.fullName} (${user.email}) submitted a loan application for ${formatRand(amount)} with different details than their approved profile. Changed fields: ${fieldList}. Please review loan application #${loan.id}.`
              )
            )
          );
        } catch {
          // Non-critical — do not block response
        }
      })();
    }

    return NextResponse.json({ message: "Loan application submitted", loan }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}