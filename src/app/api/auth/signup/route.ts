import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { hash } from "@/lib/bcrypt";
import { buildFaceIdExternalUserId, submitToSmileId } from "@/lib/faceId";
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
    const { fullName, email, persalNumber, password, phone, idNumber, bankName, accountNumber, address, registrationFacePhoto } = data;
    const normalizedFullName = String(fullName ?? "").trim().replace(/\s+/g, " ");
    const normalizedAddress = String(address ?? "").trim();

    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedPersal = normalizePersalNumber(String(persalNumber ?? "").trim());
    const normalizedIdNumber = normalizeIdNumber(String(idNumber ?? "").trim());
    const normalizedPhone = normalizePhoneNumber(String(phone ?? "").trim());
    const normalizedAccountNumber = normalizeAccountNumber(String(accountNumber ?? "").trim());
    const normalizedBankName = String(bankName ?? "").trim();
    const normalizedRegistrationFacePhoto = String(registrationFacePhoto ?? "").trim();

    if (!normalizedFullName || !email || !persalNumber || !password || !normalizedPhone || !normalizedIdNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!normalizedRegistrationFacePhoto || normalizedRegistrationFacePhoto.length < 100) {
      return NextResponse.json(
        { error: "Face registration is required. Please capture your face photo before submitting." },
        { status: 400 }
      );
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

    const partnerId = process.env.SMILE_PARTNER_ID;
    const apiKey = process.env.SMILE_API_KEY;
    const callbackUrl = process.env.SMILE_CALLBACK_URL ?? "";
    const env = (process.env.SMILE_ENV === "production" ? "production" : "sandbox") as "sandbox" | "production";
    const smileConfigured = Boolean(partnerId && apiKey);

    const hashedPassword = await hash(password);
    const userId = randomUUID();
    const externalUserId = buildFaceIdExternalUserId(userId);

    // Create the user first with the registration face photo stored locally.
    // New schema fields are set via a follow-up raw update so stale Prisma client
    // runtime doesn't cause a P2022 / unknown-field error on create.
    const user = await prisma.user.create({
      data: {
        fullName: normalizedFullName,
        email: normalizedEmail,
        persalNumber: normalizedPersal,
        password: hashedPassword,
        phone: normalizedPhone,
        idNumber: normalizedIdNumber,
        bankName: normalizedBankName || null,
        accountNumber: normalizedAccountNumber || null,
        address: normalizedAddress || null,
      },
    });

    // Back-fill face-registration fields safely (tolerant to Prisma client drift).
    try {
      await prisma.$executeRaw`
        UPDATE "User"
        SET
          "faceIdExternalUserId" = ${externalUserId},
          "faceIdRegistrationPhoto" = ${normalizedRegistrationFacePhoto},
          "faceIdStatus" = 'PENDING',
          "faceIdLastCheckedAt" = NOW()
        WHERE id = ${user.id}
      `;
    } catch {
      // Non-fatal: face fields may not exist in an older migration state.
    }

    // If SmileId is configured, attempt enrollment now.
    // Enrollment failure does NOT block account creation — the user can
    // retry face verification from the dashboard.
    if (smileConfigured) {
      try {
        const enrollmentResult = await submitToSmileId({
          partnerId: partnerId!,
          apiKey: apiKey!,
          externalUserId,
          jobType: 1,
          selfieBase64: normalizedRegistrationFacePhoto,
          callbackUrl,
          env,
        });

        if (enrollmentResult.approved) {
          await prisma.$executeRaw`
            UPDATE "User"
            SET
              "faceIdEnrolled" = true,
              "faceIdStatus" = 'ENROLLED',
              "faceIdVerifiedAt" = NOW(),
              "faceIdLastCheckedAt" = NOW(),
              "faceIdLastError" = NULL
            WHERE id = ${user.id}
          `;
        } else {
          await prisma.$executeRaw`
            UPDATE "User"
            SET
              "faceIdStatus" = 'PENDING',
              "faceIdLastCheckedAt" = NOW(),
              "faceIdLastError" = ${"enrollment_pending"}
            WHERE id = ${user.id}
          `;
        }
      } catch {
        // SmileId call failed — user is still created, face can be enrolled later.
      }
    }

    return NextResponse.json({ message: "User created", user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    console.error("[signup] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
