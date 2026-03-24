import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import {
  exchangeCodeForToken,
  getUserBankAccounts,
  mapStitchAccountType,
  stitchIdToBankName,
} from "@/lib/stitch";

interface PkceSession {
  codeVerifier: string;
  state: string;
  nonce: string;
  returnTo: string;
}

/**
 * GET /api/stitch/callback
 * Handles the Stitch OAuth2 redirect after the user authorizes bank account access.
 * Exchanges the authorization code for a token, fetches the user's bank accounts,
 * and updates the user's profile with the verified bank details.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  // Retrieve and parse PKCE session from cookie
  const cookieStr = req.cookies.get("stitch_pkce")?.value;
  if (!cookieStr) {
    return redirectWithError(req, "/dashboard/lending/bank-details", "session_expired");
  }

  let pkce: PkceSession;
  try {
    pkce = JSON.parse(cookieStr) as PkceSession;
  } catch {
    return redirectWithError(req, "/dashboard/lending/bank-details", "invalid_session");
  }

  const returnTo = pkce.returnTo ?? "/dashboard/lending/bank-details";

  // Clear the PKCE cookie in all response paths from here
  const clearPkce = (res: NextResponse) => {
    res.cookies.delete("stitch_pkce");
    return res;
  };

  // User declined or Stitch returned an error
  if (errorParam) {
    return clearPkce(redirectWithError(req, returnTo, errorParam));
  }

  // Validate required params and CSRF state
  if (!code || !state || state !== pkce.state) {
    return clearPkce(redirectWithError(req, returnTo, "invalid_state"));
  }

  try {
    const tokens = await exchangeCodeForToken(code, pkce.codeVerifier);
    const accounts = await getUserBankAccounts(tokens.access_token);

    if (accounts.length > 0) {
      const account = accounts[0];
      const bankName = stitchIdToBankName(account.bankId);
      const accountType = mapStitchAccountType(account.accountType);

      await (prisma.user.update as Function)({
        where: { id: session.user.id },
        data: {
          bankName,
          accountNumber: account.accountNumber,
          accountType,
          branchCode: account.branchCode,
          bankVerified: true,
          stitchAccountId: account.id,
        },
      });

      console.info("[stitch] bank-account-verified", {
        userId: session.user.id,
        bankId: account.bankId,
        at: new Date().toISOString(),
      });
    } else {
      // No accounts returned — still mark the flow as completed so UX can respond
      console.warn("[stitch] callback: no bank accounts returned for user", session.user.id);
    }

    const res = NextResponse.redirect(new URL(`${returnTo}?stitch_verified=true`, req.url));
    return clearPkce(res);
  } catch (err) {
    console.error("[stitch] callback error:", err);
    return clearPkce(redirectWithError(req, returnTo, "token_exchange_failed"));
  }
}

function redirectWithError(req: NextRequest, returnTo: string, errorCode: string) {
  return NextResponse.redirect(
    new URL(`${returnTo}?stitch_error=${encodeURIComponent(errorCode)}`, req.url)
  );
}
