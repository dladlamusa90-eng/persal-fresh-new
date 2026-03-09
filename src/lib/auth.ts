import crypto from "crypto";
import type { NextResponse } from "next/server";
import { compare } from "@/lib/bcrypt";
import { getAuthSecret } from "@/lib/authSecret";

const AUTH_COOKIE_NAME = "auth_token";
const AUTH_TTL_SECONDS = 60 * 60 * 24 * 7;

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function verifyPassword(password: string, hash: string) {
  return compare(password, hash);
}

export async function signAuthToken(email: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: email, email, iat: now, exp: now + AUTH_TTL_SECONDS };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signature}`;
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_TTL_SECONDS,
  });
}
