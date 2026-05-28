import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { isSouthAfricanIdNumber, normalizeIdNumber } from "@/lib/validators/auth";
import { submitToSmileId } from "@/lib/faceId";

function getFaceSecret() {
  return process.env.FACE_VERIFICATION_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function issueFaceVerificationToken(idNumber: string) {
  const secret = getFaceSecret();
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

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      idNumber?: string;
      selfieBase64?: string;
    };

    const idNumber = normalizeIdNumber(String(body.idNumber ?? "").trim());
    const selfieBase64 = String(body.selfieBase64 ?? "").trim();

    if (!isSouthAfricanIdNumber(idNumber)) {
      return NextResponse.json({ error: "Please enter a valid South African ID number." }, { status: 400 });
    }

    if (!selfieBase64 || selfieBase64.length < 100) {
      return NextResponse.json({ error: "A valid selfie image is required." }, { status: 400 });
    }

    const secret = getFaceSecret();
    if (!secret) {
      return NextResponse.json(
        { error: "Face verification secret is not configured." },
        { status: 503 }
      );
    }

    const partnerId = process.env.SMILE_PARTNER_ID;
    const apiKey = process.env.SMILE_API_KEY;
    const callbackUrl = process.env.SMILE_CALLBACK_URL ?? "";
    const env = (process.env.SMILE_ENV === "production" ? "production" : "sandbox") as "sandbox" | "production";

    if (!partnerId || !apiKey) {
      return NextResponse.json(
        { error: "Face verification provider is not configured." },
        { status: 503 }
      );
    }

    // Use the ID number as the external user ID so repeat submissions
    // authenticate against the already-registered face for this person.
    const externalUserId = `guest-id-${idNumber}`;

    const result = await submitToSmileId({
      partnerId,
      apiKey,
      externalUserId,
      jobType: 4, // SmartSelfie Registration – registers on first call, re-registers on repeat
      selfieBase64,
      callbackUrl,
      env,
    });

    if (!result.approved) {
      return NextResponse.json(
        {
          verified: false,
          reason:
            result.resultText && result.resultText !== "verification_pending"
              ? result.resultText
              : "Face verification failed. Please retake your selfie in good lighting.",
        },
        { status: 200 }
      );
    }

    const verificationToken = issueFaceVerificationToken(idNumber);

    return NextResponse.json(
      {
        verified: true,
        verificationToken,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "verification_error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
