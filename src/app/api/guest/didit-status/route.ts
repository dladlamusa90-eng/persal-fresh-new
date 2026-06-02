import { createHmac } from "crypto";
import { NextResponse } from "next/server";

function issueFaceVerificationToken(idNumber: string): string {
  const secret = process.env.FACE_VERIFICATION_SECRET || process.env.NEXTAUTH_SECRET || "";
  if (!secret) return "";

  const payload = {
    idNumber,
    approved: true,
    exp: Date.now() + 10 * 60 * 1000,
  };

  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(base).digest("base64url");
  return `${base}.${sig}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Verification service not configured." }, { status: 503 });
  }

  const diditRes = await fetch(
    `https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/decision/`,
    { headers: { "x-api-key": apiKey }, cache: "no-store" }
  );

  if (!diditRes.ok) {
    return NextResponse.json({ verified: false, status: "In Progress" }, { status: 200 });
  }

  const data = (await diditRes.json()) as {
    status?: string;
    vendor_data?: string;
  };

  const status = data.status ?? "In Progress";

  if (status === "Approved") {
    // vendor_data is "guest-id-{idNumber}" — extract the ID number
    const vendorData = data.vendor_data ?? "";
    const idNumber = vendorData.startsWith("guest-id-") ? vendorData.slice("guest-id-".length) : "";

    const secret = process.env.FACE_VERIFICATION_SECRET || process.env.NEXTAUTH_SECRET || "";
    if (!idNumber || !secret) {
      return NextResponse.json({ verified: false, status: "Approved", error: "Token issuance failed." });
    }

    const verificationToken = issueFaceVerificationToken(idNumber);
    return NextResponse.json({ verified: true, status, verificationToken }, { status: 200 });
  }

  if (status === "Declined") {
    return NextResponse.json({ verified: false, status, error: "Verification declined. Please try again." }, { status: 200 });
  }

  return NextResponse.json({ verified: false, status }, { status: 200 });
}
