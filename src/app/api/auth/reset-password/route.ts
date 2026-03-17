import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash, compare } from "@/lib/bcrypt";
import prisma from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { isSouthAfricanIdNumber, normalizePhoneNumber } from "@/lib/validators/auth";
import { takeRateLimitToken } from "@/lib/security/rateLimit";

const passwordResetOtpDelegate = (prisma as any).passwordResetOtp;

function getRequestIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

function generateOtpCode() {
  return String(randomInt(1000, 10000));
}

function maskPhoneNumber(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const lastFourDigits = normalizedPhone.slice(-4).padStart(4, "0");
  return `*** *** ${lastFourDigits}`;
}

function isStrongPassword(password: string) {
  // Minimum baseline policy for reset
  return password.length >= 8;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const limiter = takeRateLimitToken(`password-reset:${ip}`, 10 * 60 * 1000, 30);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Too many requests. Please retry shortly." }, { status: 429 });
    }

    const body = await req.json();
    const action = String(body?.action ?? "").trim();

    if (action === "request-otp") {
      const identifier = String(body?.identifier ?? "").trim().toLowerCase();
      if (!identifier) {
        return NextResponse.json({ error: "Please provide your email or ID number." }, { status: 400 });
      }

      const isEmail = identifier.includes("@");
      const where = isEmail
        ? { email: identifier }
        : isSouthAfricanIdNumber(identifier)
          ? { idNumber: identifier }
          : null;

      if (!where) {
        return NextResponse.json(
          { error: "Enter a valid email address or 13-digit SA ID number." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where,
        select: {
          id: true,
          phone: true,
          isBurned: true,
        },
      });

      // Avoid account enumeration by returning success even when user is missing.
      if (!user) {
        return NextResponse.json(
          { message: "If the account exists, a reset OTP has been sent." },
          { status: 200 }
        );
      }

      if (user.isBurned) {
        return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
      }

      if (!user.phone) {
        return NextResponse.json(
          { error: "No cellphone number is registered for this account." },
          { status: 400 }
        );
      }

      const otpCode = generateOtpCode();
      const otpHash = await hash(otpCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await passwordResetOtpDelegate.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await passwordResetOtpDelegate.create({
        data: {
          userId: user.id,
          codeHash: otpHash,
          expiresAt,
        },
      });

      await sendSms(
        user.phone,
        `Your Persal password reset OTP is: ${otpCode}. It expires in 10 minutes. Do not share this code with anyone.`
      );

      return NextResponse.json(
        {
          message: "If the account exists, a reset OTP has been sent.",
          maskedPhone: maskPhoneNumber(user.phone),
        },
        { status: 200 }
      );
    }

    if (action === "confirm-reset") {
      const identifier = String(body?.identifier ?? "").trim().toLowerCase();
      const otpCode = String(body?.otpCode ?? "").trim();
      const newPassword = String(body?.newPassword ?? "");

      if (!identifier || !otpCode || !newPassword) {
        return NextResponse.json(
          { error: "Email/ID, OTP code, and new password are required." },
          { status: 400 }
        );
      }

      if (!/^\d{4}$/.test(otpCode)) {
        return NextResponse.json({ error: "Please enter the 4-digit OTP." }, { status: 400 });
      }

      if (!isStrongPassword(newPassword)) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long." },
          { status: 400 }
        );
      }

      const isEmail = identifier.includes("@");
      const where = isEmail
        ? { email: identifier }
        : isSouthAfricanIdNumber(identifier)
          ? { idNumber: identifier }
          : null;

      if (!where) {
        return NextResponse.json(
          { error: "Enter a valid email address or 13-digit SA ID number." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where,
        select: {
          id: true,
          isBurned: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "Invalid reset request." }, { status: 400 });
      }

      if (user.isBurned) {
        return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
      }

      const otpRecord = await passwordResetOtpDelegate.findFirst({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!otpRecord || otpRecord.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "OTP expired or missing. Request a new OTP." }, { status: 400 });
      }

      if (otpRecord.attempts >= 5) {
        await passwordResetOtpDelegate.update({
          where: { id: otpRecord.id },
          data: { consumedAt: new Date() },
        });

        return NextResponse.json(
          { error: "Too many incorrect attempts. Request a new OTP." },
          { status: 429 }
        );
      }

      const isMatch = await compare(otpCode, otpRecord.codeHash);
      if (!isMatch) {
        await passwordResetOtpDelegate.update({
          where: { id: otpRecord.id },
          data: { attempts: otpRecord.attempts + 1 },
        });
        return NextResponse.json({ error: "Invalid OTP." }, { status: 401 });
      }

      const hashedPassword = await hash(newPassword);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        }),
        passwordResetOtpDelegate.update({
          where: { id: otpRecord.id },
          data: { consumedAt: new Date() },
        }),
      ]);

      return NextResponse.json({ message: "Password reset successful." }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
