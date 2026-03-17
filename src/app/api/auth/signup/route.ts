import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "@/lib/bcrypt";
import {
  getBankAccountConstraintLabel,
  isValidBankAccountNumber,
  isSouthAfricanIdNumber,
  isSouthAfricanBankName,
  isSouthAfricanPhoneNumber,
  isValidPersalNumber,
  normalizeAccountNumber,
  normalizeIdNumber,
  normalizePersalNumber,
  normalizePhoneNumber,
} from "@/lib/validators/auth";
import { takeRateLimitToken } from "@/lib/security/rateLimit";

function getRequestIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const limiter = takeRateLimitToken(`signup:${ip}`, 10 * 60 * 1000, 20);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const data = await req.json();
    const { fullName, email, persalNumber, password, phone, idNumber, bankName, accountNumber } = data;

    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedPersal = normalizePersalNumber(String(persalNumber ?? "").trim());
    const normalizedIdNumber = normalizeIdNumber(String(idNumber ?? "").trim());
    const normalizedPhone = normalizePhoneNumber(String(phone ?? "").trim());
    const normalizedAccountNumber = normalizeAccountNumber(String(accountNumber ?? "").trim());
    const normalizedBankName = String(bankName ?? "").trim();

    if (!fullName || !email || !persalNumber || !password || !normalizedPhone || !normalizedIdNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isSouthAfricanPhoneNumber(normalizedPhone)) {
      return NextResponse.json(
        { error: "Please enter a valid South African phone number (e.g. 0821234567 or +27821234567)." },
        { status: 400 }
      );
    }

    if (!isValidPersalNumber(normalizedPersal)) {
      return NextResponse.json(
        { error: "Persal Number must be exactly 8 digits." },
        { status: 400 }
      );
    }

    if (!isSouthAfricanIdNumber(normalizedIdNumber)) {
      return NextResponse.json(
        { error: "Please enter a valid South African ID Number." },
        { status: 400 }
      );
    }

    const hasBankFields = Boolean(normalizedBankName || normalizedAccountNumber);
    if (hasBankFields) {
      if (!normalizedBankName || !normalizedAccountNumber) {
        return NextResponse.json(
          { error: "Bank Name and Account Number must both be provided." },
          { status: 400 }
        );
      }

      if (!isSouthAfricanBankName(normalizedBankName)) {
        return NextResponse.json(
          { error: "Please select a valid South African bank." },
          { status: 400 }
        );
      }

      if (!isValidBankAccountNumber(normalizedBankName, normalizedAccountNumber)) {
        return NextResponse.json(
          { error: `Account Number for ${normalizedBankName} must be ${getBankAccountConstraintLabel(normalizedBankName)}.` },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          { persalNumber: normalizedPersal },
          { idNumber: normalizedIdNumber },
          { phone: normalizedPhone },
        ],
      },
      select: {
        email: true,
        persalNumber: true,
        idNumber: true,
        phone: true,
      },
    });

    if (existingUser) {
      if ((existingUser.email ?? "").toLowerCase() === normalizedEmail) {
        return NextResponse.json(
          { error: "An account with this Email already exists. Please sign in." },
          { status: 409 }
        );
      }

      if ((existingUser.persalNumber ?? "").trim() === normalizedPersal) {
        return NextResponse.json(
          { error: "An account with this Persal Number already exists. Please sign in." },
          { status: 409 }
        );
      }

      if ((existingUser.idNumber ?? "").trim() === normalizedIdNumber) {
        return NextResponse.json(
          { error: "An account with this ID Number already exists. Please sign in." },
          { status: 409 }
        );
      }

      if ((existingUser.phone ?? "").trim() === normalizedPhone) {
        return NextResponse.json(
          { error: "An account with this Cell Number already exists. Please sign in." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "An account with these details already exists. Please sign in." },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password);
    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        persalNumber: normalizedPersal,
        password: hashedPassword,
        phone: normalizedPhone,
        idNumber: normalizedIdNumber,
        bankName: normalizedBankName || null,
        accountNumber: normalizedAccountNumber || null,
      },
    });
    return NextResponse.json({ message: "User created", user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
