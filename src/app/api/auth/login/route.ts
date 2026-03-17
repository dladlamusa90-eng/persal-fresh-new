import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import prisma from "@/lib/prisma";
import { loginSchema } from "../../../../lib/validators/auth";
import { setAuthCookie, signAuthToken, verifyPassword } from "../../../../lib/auth";
import { isSouthAfricanIdNumber, normalizeIdNumber, normalizePhoneNumber } from "@/lib/validators/auth";
import { compare, hash } from "@/lib/bcrypt";
import { sendSms } from "@/lib/sms";
import {
  clearAuthFailures,
  isAuthLocked,
  registerAuthFailure,
  takeRateLimitToken,
} from "@/lib/security/rateLimit";

function getRequestIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

function maskPhoneNumber(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const lastFourDigits = normalizedPhone.slice(-4).padStart(4, "0");
  return `*** *** ${lastFourDigits}`;
}

function generateOtpCode(): string {
  // Cryptographically secure 4-digit OTP (1000–9999)
  return String(randomInt(1000, 10000));
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const limiter = takeRateLimitToken(`login:${ip}`, 10 * 60 * 1000, 60);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Too many requests. Please retry shortly." }, { status: 429 });
    }

    const body = await req.json();

    if (body?.action === "request-otp") {
      const idNumber = String(body.idNumber ?? "").trim();
      if (!isSouthAfricanIdNumber(idNumber)) {
        return NextResponse.json({ error: "Please enter a valid 13-digit SA ID number." }, { status: 400 });
      }

      const user = await prisma.user.findFirst({
        where: { idNumber },
        select: {
          id: true,
          phone: true,
          isBurned: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "We could not find an account for that ID number." }, { status: 404 });
      }

      if (user.isBurned) {
        return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
      }

      if (!user.phone) {
        return NextResponse.json({ error: "No cellphone number is registered for this account." }, { status: 400 });
      }

      const otpCode = generateOtpCode();
      const otpHash = await hash(otpCode);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await prisma.loginOtp.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await prisma.loginOtp.create({
        data: {
          userId: user.id,
          codeHash: otpHash,
          expiresAt,
        },
      });

      await sendSms(
        user.phone,
        `Your Persal login OTP is: ${otpCode}. It expires in 5 minutes. Do not share this code with anyone.`
      );

      return NextResponse.json(
        {
          message: "OTP sent",
          maskedPhone: maskPhoneNumber(user.phone),
        },
        { status: 200 }
      );
    }

    if (body?.action === "verify-otp") {
      const idNumber = String(body.idNumber ?? "").trim();
      const otpCode = String(body.otpCode ?? "").trim();

      if (!isSouthAfricanIdNumber(idNumber)) {
        return NextResponse.json({ error: "Please enter a valid 13-digit SA ID number." }, { status: 400 });
      }

      if (!/^\d{4}$/.test(otpCode)) {
        return NextResponse.json({ error: "Please enter the 4-digit OTP." }, { status: 400 });
      }

      const user = await prisma.user.findFirst({
        where: { idNumber },
        select: {
          id: true,
          email: true,
          role: true,
          isBurned: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "We could not find an account for that ID number." }, { status: 404 });
      }

      if (user.isBurned) {
        return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
      }

      const otpRecord = await prisma.loginOtp.findFirst({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!otpRecord || otpRecord.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: "OTP expired or missing. Please request a new OTP." }, { status: 400 });
      }

      if (otpRecord.attempts >= 5) {
        await prisma.loginOtp.update({
          where: { id: otpRecord.id },
          data: { consumedAt: new Date() },
        });
        return NextResponse.json({ error: "Too many incorrect OTP attempts. Request a new OTP." }, { status: 429 });
      }

      const isMatch = await compare(otpCode, otpRecord.codeHash);
      if (!isMatch) {
        await prisma.loginOtp.update({
          where: { id: otpRecord.id },
          data: { attempts: otpRecord.attempts + 1 },
        });
        return NextResponse.json({ error: "Invalid OTP." }, { status: 401 });
      }

      await prisma.loginOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      });

      const token = await signAuthToken(user.email);
      const res = NextResponse.json(
        {
          message: "Login successful",
          user: { id: user.id, email: user.email, role: user.role },
        },
        { status: 200 }
      );
      setAuthCookie(res, token);
      return res;
    }

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const identifier = parsed.data.identifier.trim();
    const normalizedId = normalizeIdNumber(identifier);
    const usingId = isSouthAfricanIdNumber(normalizedId);
    const normalizedEmail = identifier.toLowerCase();
    const password = parsed.data.password;
    const lockKey = `login:${usingId ? normalizedId : normalizedEmail}:${ip}`;
    const lock = isAuthLocked(lockKey);
    if (lock.locked) {
      return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429 });
    }

    const user = await prisma.user.findFirst({
      where: usingId
        ? { idNumber: normalizedId }
        : { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true, email: true, password: true, isBurned: true },
    });

    if (!user) {
      registerAuthFailure(lockKey);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.isBurned) {
      return NextResponse.json({ error: "This account is blocked" }, { status: 403 });
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      registerAuthFailure(lockKey);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    clearAuthFailures(lockKey);

    const token = await signAuthToken(user.email);
    const res = NextResponse.json(
      { message: "Login successful", user: { id: user.id, email: user.email } },
      { status: 200 }
    );
    setAuthCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
