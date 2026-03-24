import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: session.user.id
        ? { id: session.user.id }
        : { email: String(session.user.email ?? "") },
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
      } as any,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
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
    };

    // Address-only partial update
    if (Object.keys(body).length === 1 && "address" in body) {
      const currentUser = await prisma.user.findUnique({
        where: session.user.id ? { id: session.user.id } : { email: String(session.user.email ?? "") },
        select: { id: true },
      });
      if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { address: body.address ?? null } as any,
      });
      return NextResponse.json({ message: "Address updated" }, { status: 200 });
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
      where: session.user.id
        ? { id: session.user.id }
        : { email: String(session.user.email ?? "") },
      select: { id: true, email: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
