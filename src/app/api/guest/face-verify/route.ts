import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { isSouthAfricanIdNumber, normalizeIdNumber } from "@/lib/validators/auth";

type SmileVerifyResponse = {
  success: boolean;
  confidence: number;
  raw: unknown;
};

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

async function verifySelfieWithSmile(params: {
  idNumber: string;
  selfieBase64: string;
}): Promise<SmileVerifyResponse> {
  const smileApiUrl = process.env.SMILE_API_URL;
  const partnerId = process.env.SMILE_PARTNER_ID;
  const apiKey = process.env.SMILE_API_KEY;

  if (!smileApiUrl || !partnerId) {
    throw new Error("Face verification provider is not configured.");
  }

  const payload = {
    partner_id: partnerId,
    job_type: "smart_selfie_authentication",
    id_number: params.idNumber,
    selfie_image: params.selfieBase64.replace(/^data:[a-z/]+;base64,/, ""),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(smileApiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const confidence = Number(
    raw.confidence_score ?? raw.confidence ?? (raw.result as Record<string, unknown> | undefined)?.confidence ?? 0
  );

  const success = Boolean(
    raw.success ?? raw.verified ?? (raw.result as Record<string, unknown> | undefined)?.verified ?? false
  );

  return { success, confidence, raw };
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

    const verification = await verifySelfieWithSmile({ idNumber, selfieBase64 });
    const approved = verification.success === true && verification.confidence > 0.95;

    if (!approved) {
      return NextResponse.json(
        {
          verified: false,
          reason: "Face verification failed against the submitted ID. Please try again.",
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
