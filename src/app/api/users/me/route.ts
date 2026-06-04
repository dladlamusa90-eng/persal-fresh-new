import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import { getAuthCookieName, verifyAuthToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hash, compare } from "@/lib/bcrypt";
import {
  getBankAccountConstraintLabel,
  isValidBankAccountType,
  isValidBranchCode,
  isSouthAfricanBankName,
  isSouthAfricanIdNumber,
  isSouthAfricanPhoneNumber,
  isValidBankAccountNumber,
  isValidPersalNumber,
  normalizeAccountNumber,
  normalizeIdNumber,
  normalizePersalNumber,
  normalizePhoneNumber,
} from "@/lib/validators/auth";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function resolveAuthenticatedIdentity(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.id || session?.user?.email) {
    return {
      id: session.user.id ?? null,
      email: session.user.email ? String(session.user.email) : null,
    };
  }

  const authToken = req.cookies.get(getAuthCookieName())?.value;
  if (!authToken) {
    return null;
  }

  const payload = verifyAuthToken(authToken);
  if (!payload?.email) {
    return null;
  }

  return {
    id: null,
    email: payload.email,
  };
}

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveAuthenticatedIdentity(req);

    if (!identity?.id && !identity?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: identity.id
        ? { id: identity.id }
        : { email: String(identity.email ?? "") },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        idNumber: true,
        persalNumber: true,
        bankName: true,
        accountNumber: true,
        accountType: true,
        branchCode: true,
        bankVerified: true,
        profileImage: true,
        address: true,
        points: true,
        role: true,
        isBurned: true,
        isDeleted: true,
        applicationStatus: true,
        employmentStatus: true,
        employmentGrossIncome: true,
        employmentNetIncome: true,
        incomeFrequency: true,
        salaryDay: true,
        occupation: true,
        employer: true,
        department: true,
      } as any,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if ((user as any).isBurned || (user as any).isDeleted) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch referral fields via raw query (Prisma client may be ahead/behind schema)
    const referralRows = await prisma.$queryRaw<
      { referralCode: string | null; referralDiscountPct: number }[]
    >`SELECT "referralCode", "referralDiscountPct" FROM "User" WHERE id = ${(user as any).id}`;
    const referralData = referralRows[0] ?? { referralCode: null, referralDiscountPct: 0 };

    return NextResponse.json({ user: { ...user, ...referralData } }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/users/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await resolveAuthenticatedIdentity(req);

    if (!identity?.id && !identity?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      idNumber?: string;
      persalNumber?: string;
      bankName?: string;
      accountNumber?: string;
      accountType?: string;
      branchCode?: string;
      profileImage?: string | null;
      address?: string | null;
      currentPassword?: string;
      newPassword?: string;
    };

    // Allow persalNumber-only update for Persal submission
    if (Object.keys(body).length === 1 && "persalNumber" in body) {
      const persal = normalizePersalNumber(String(body.persalNumber ?? "").trim());
      if (!isValidPersalNumber(persal)) {
        return NextResponse.json({ error: "Persal Number must be exactly 8 digits." }, { status: 400 });
      }
      // Check for duplicate Persal
      const existing = await prisma.user.findFirst({
        where: { persalNumber: persal, NOT: { id: identity.id ? identity.id : undefined } },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: "Persal Number already belongs to another account" }, { status: 409 });
      }
      const updatedUser = await prisma.user.update({
        where: identity.id ? { id: identity.id } : { email: String(identity.email ?? "") },
        data: { persalNumber: persal, applicationStatus: "PENDING" },
        select: { id: true, persalNumber: true, applicationStatus: true },
      });
      return NextResponse.json({ message: "Persal submitted", user: updatedUser }, { status: 200 });
    }

    // Address-only partial update
    if (Object.keys(body).length === 1 && "address" in body) {
      const currentUser = await prisma.user.findUnique({
        where: identity.id ? { id: identity.id } : { email: String(identity.email ?? "") },
        select: { id: true },
      });
      if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { address: body.address ?? null } as any,
      });
      return NextResponse.json({ message: "Address updated" }, { status: 200 });
    }

    // Employment-only partial update
    const employmentKeys = ["employmentStatus", "employmentGrossIncome", "employmentNetIncome", "incomeFrequency", "salaryDay", "occupation", "employer", "department"];
    if (employmentKeys.some(k => k in body) && Object.keys(body).every(k => employmentKeys.includes(k))) {
      const currentUser = await prisma.user.findUnique({
        where: identity.id ? { id: identity.id } : { email: String(identity.email ?? "") },
        select: { id: true },
      });
      if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await (prisma.user.update as any)({
        where: { id: currentUser.id },
        data: {
          employmentStatus: (body as any).employmentStatus ?? undefined,
          employmentGrossIncome: (body as any).employmentGrossIncome ?? undefined,
          employmentNetIncome: (body as any).employmentNetIncome ?? undefined,
          incomeFrequency: (body as any).incomeFrequency ?? undefined,
          salaryDay: (body as any).salaryDay ?? undefined,
          occupation: (body as any).occupation ?? undefined,
          employer: (body as any).employer ?? undefined,
          department: (body as any).department !== undefined ? ((body as any).department || null) : undefined,
        },
      });
      return NextResponse.json({ message: "Employment details updated" }, { status: 200 });
    }

    // Banking-only partial update
    const bankingKeys = ["bankName", "accountNumber", "accountType", "branchCode"];
    if (bankingKeys.some(k => k in body) && Object.keys(body).every(k => bankingKeys.includes(k))) {
      const bankingUser = await prisma.user.findUnique({
        where: identity.id ? { id: identity.id } : { email: String(identity.email ?? "") },
        select: { id: true },
      });
      if (!bankingUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const bName = String(body.bankName ?? "").trim();
      const bAccount = normalizeAccountNumber(String(body.accountNumber ?? "").trim());
      const bType = String(body.accountType ?? "").trim().toUpperCase();
      const bBranch = String(body.branchCode ?? "").trim();

      if (!isSouthAfricanBankName(bName)) {
        return NextResponse.json({ error: "Please select a valid South African bank." }, { status: 400 });
      }
      if (!isValidBankAccountNumber(bName, bAccount)) {
        return NextResponse.json(
          { error: `Account Number for ${bName} must be ${getBankAccountConstraintLabel(bName)}.` },
          { status: 400 },
        );
      }
      if (!isValidBankAccountType(bType)) {
        return NextResponse.json({ error: "Account type must be Cheque, Savings, or Transmission." }, { status: 400 });
      }
      if (!isValidBranchCode(bBranch)) {
        return NextResponse.json({ error: "Branch code must be exactly 6 digits." }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: bankingUser.id },
        data: { bankName: bName, accountNumber: bAccount, accountType: bType as any, branchCode: bBranch, bankVerified: false },
      });
      return NextResponse.json({ message: "Banking details updated" }, { status: 200 });
    }

    // Phone-only partial update
    if (Object.keys(body).length === 1 && "phone" in body) {
      const phone = normalizePhoneNumber(String(body.phone ?? "").trim());
      if (!isSouthAfricanPhoneNumber(phone)) {
        return NextResponse.json({ error: "Please enter a valid South African phone number." }, { status: 400 });
      }
      const currentUser = await prisma.user.findUnique({
        where: identity.id ? { id: identity.id } : { email: String(identity.email ?? "") },
        select: { id: true },
      });
      if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const conflict = await prisma.user.findFirst({
        where: { phone, NOT: { id: currentUser.id } },
        select: { id: true },
      });
      if (conflict) return NextResponse.json({ error: "Cell number already belongs to another account." }, { status: 409 });
      await prisma.user.update({ where: { id: currentUser.id }, data: { phone } });
      return NextResponse.json({ message: "Phone updated" }, { status: 200 });
    }

    // Email-only partial update
    if (Object.keys(body).length === 1 && "email" in body) {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      const currentUser = await prisma.user.findUnique({
        where: identity.id ? { id: identity.id } : { email: String(identity.email ?? "") },
        select: { id: true },
      });
      if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const conflict = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, NOT: { id: currentUser.id } },
        select: { id: true },
      });
      if (conflict) return NextResponse.json({ error: "Email already belongs to another account." }, { status: 409 });
      await prisma.user.update({ where: { id: currentUser.id }, data: { email } });
      return NextResponse.json({ message: "Email updated" }, { status: 200 });
    }

    // Password update
    if ("currentPassword" in body && "newPassword" in body) {
      const newPassword = String(body.newPassword ?? "");
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
      }
      const currentUser = await prisma.user.findUnique({
        where: identity.id ? { id: identity.id } : { email: String(identity.email ?? "") },
        select: { id: true, password: true },
      });
      if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const passwordMatch = await compare(String(body.currentPassword ?? ""), currentUser.password);
      if (!passwordMatch) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
      const hashedPassword = await hash(newPassword);
      await prisma.user.update({ where: { id: currentUser.id }, data: { password: hashedPassword } });
      return NextResponse.json({ message: "Password updated" }, { status: 200 });
    }

    const data = {
      fullName: String(body.fullName ?? "").trim(),
      email: String(body.email ?? "").trim().toLowerCase(),
      phone: normalizePhoneNumber(String(body.phone ?? "").trim()),
      idNumber: normalizeIdNumber(String(body.idNumber ?? "").trim()),
      persalNumber: normalizePersalNumber(String(body.persalNumber ?? "").trim()),
      bankName: String(body.bankName ?? "").trim(),
      accountNumber: normalizeAccountNumber(String(body.accountNumber ?? "").trim()),
      accountType: String(body.accountType ?? "").trim().toUpperCase(),
      branchCode: String(body.branchCode ?? "").trim(),
      profileImage: body.profileImage ?? null,
      address: body.address ?? null,
    };

    if (!data.fullName || !data.email || !data.phone || !data.idNumber || !data.persalNumber || !data.bankName || !data.accountNumber || !data.accountType || !data.branchCode) {
      return NextResponse.json({ error: "All profile fields are required" }, { status: 400 });
    }

    if (!isValidEmail(data.email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!isSouthAfricanPhoneNumber(data.phone)) {
      return NextResponse.json(
        { error: "Please enter a valid South African phone number (e.g. 0821234567 or +27821234567)." },
        { status: 400 }
      );
    }

    if (!isValidPersalNumber(data.persalNumber)) {
      return NextResponse.json({ error: "Persal Number must be exactly 8 digits." }, { status: 400 });
    }

    if (!isSouthAfricanIdNumber(data.idNumber)) {
      return NextResponse.json({ error: "Please enter a valid South African ID Number." }, { status: 400 });
    }

    if (!isSouthAfricanBankName(data.bankName)) {
      return NextResponse.json({ error: "Please select a valid South African bank." }, { status: 400 });
    }

    if (!isValidBankAccountNumber(data.bankName, data.accountNumber)) {
      return NextResponse.json(
        { error: `Account Number for ${data.bankName} must be ${getBankAccountConstraintLabel(data.bankName)}.` },
        { status: 400 }
      );
    }

    if (!isValidBankAccountType(data.accountType)) {
      return NextResponse.json({ error: "Account type must be Cheque, Savings, or Transmission." }, { status: 400 });
    }

    if (!isValidBranchCode(data.branchCode)) {
      return NextResponse.json({ error: "Branch code must be exactly 6 digits." }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: identity.id
        ? { id: identity.id }
        : { email: String(identity.email ?? "") },
      select: { id: true, email: true, isBurned: true, isDeleted: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentUser.isBurned || currentUser.isDeleted) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conflictingUser = await prisma.user.findFirst({
      where: {
        id: { not: currentUser.id },
        OR: [
          { email: { equals: data.email, mode: "insensitive" } },
          { persalNumber: data.persalNumber },
          { idNumber: data.idNumber },
          { phone: data.phone },
        ],
      },
      select: {
        email: true,
        persalNumber: true,
        idNumber: true,
        phone: true,
      },
    });

    if ((conflictingUser?.email ?? "").toLowerCase() === data.email.toLowerCase()) {
      return NextResponse.json({ error: "Email already belongs to another account" }, { status: 409 });
    }

    if (conflictingUser?.persalNumber === data.persalNumber) {
      return NextResponse.json({ error: "Persal Number already belongs to another account" }, { status: 409 });
    }

    if (conflictingUser?.idNumber === data.idNumber) {
      return NextResponse.json({ error: "ID Number already belongs to another account" }, { status: 409 });
    }

    if (conflictingUser?.phone === data.phone) {
      return NextResponse.json({ error: "Cell Number already belongs to another account" }, { status: 409 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: data as any,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        idNumber: true,
        persalNumber: true,
        bankName: true,
        accountNumber: true,
        profileImage: true,
        address: true,
        points: true,
      } as any,
    });

    return NextResponse.json({ message: "Profile updated", user: updatedUser }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
