import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { loginSchema } from "../../../../lib/validators/auth";
import { setAuthCookie, signAuthToken, verifyPassword } from "../../../../lib/auth";
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

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const limiter = takeRateLimitToken(`login:${ip}`, 10 * 60 * 1000, 60);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Too many requests. Please retry shortly." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;
    const lockKey = `login:${email}:${ip}`;
    const lock = isAuthLocked(lockKey);
    if (lock.locked) {
      return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
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
