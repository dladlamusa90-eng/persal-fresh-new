import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import {
  buildAuthorizationUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
} from "@/lib/stitch";

/**
 * GET /api/stitch/link
 * Initiates the Stitch bank account verification OAuth2 PKCE flow.
 * Query param: returnTo (default /dashboard/lending/bank-details)
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const returnTo =
    req.nextUrl.searchParams.get("returnTo") ?? "/dashboard/lending/bank-details";

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const nonce = generateNonce();
  const state = generateNonce();

  let authUrl: string;
  try {
    authUrl = buildAuthorizationUrl({ codeChallenge, nonce, state });
  } catch {
    return NextResponse.json(
      { error: "Stitch is not configured. Please contact support." },
      { status: 503 }
    );
  }

  // Store PKCE verifier + state in a short-lived httpOnly cookie (15 min)
  const pkcePayload = JSON.stringify({ codeVerifier, state, nonce, returnTo });
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("stitch_pkce", pkcePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  return response;
}
