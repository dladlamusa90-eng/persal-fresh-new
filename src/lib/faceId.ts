import { createHmac } from "crypto";

export type FaceIdStatus = "PENDING" | "ENROLLED" | "VERIFIED" | "FAILED";

export function buildFaceIdExternalUserId(userId: string): string {
  return `persal_user_${userId}`;
}

function getNestedString(input: unknown, paths: string[]): string | null {
  if (!input || typeof input !== "object") return null;

  for (const path of paths) {
    const value = path
      .split(".")
      .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), input);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function extractSmileExternalUserId(payload: unknown): string | null {
  return getNestedString(payload, [
    "user_id",
    "userId",
    "partner_params.user_id",
    "partnerParams.userId",
    "metadata.user_id",
    "result.user_id",
    "result.userId",
    "uid",
  ]);
}

export function extractSmileStatusText(payload: unknown): string {
  return (
    getNestedString(payload, [
      "result_text",
      "resultText",
      "result.ResultText",
      "result.result_text",
      "result.status",
      "status",
      "job_status",
      "message",
      "code",
    ]) ?? ""
  ).toLowerCase();
}

export function isSmileApproved(payload: unknown): boolean | null {
  const statusText = extractSmileStatusText(payload);
  if (!statusText) return null;

  if (
    statusText.includes("approved") ||
    statusText.includes("success") ||
    statusText.includes("verified") ||
    statusText.includes("passed") ||
    statusText.includes("enrolled") ||        // Job Type 1 success
    statusText.includes("authenticated")       // Job Type 2 success
  ) {
    return true;
  }

  if (
    statusText.includes("reject") ||
    statusText.includes("fail") ||
    statusText.includes("denied") ||
    statusText.includes("spoof")
  ) {
    return false;
  }

  return null;
}

export function isFaceIdVerified(user: { faceIdStatus?: string | null; faceIdVerifiedAt?: Date | string | null }): boolean {
  if (user.faceIdStatus !== "VERIFIED") return false;
  return Boolean(user.faceIdVerifiedAt);
}

// ── Smile ID API ─────────────────────────────────────────────────────────────

export function generateSmileSignature(apiKey: string, timestamp: string, partnerId: string): string {
  return createHmac("sha256", apiKey)
    .update(timestamp + partnerId + "sid_request")
    .digest("base64");
}

export interface SmileSubmitParams {
  partnerId: string;
  apiKey: string;
  externalUserId: string;
  jobType: 1 | 2;
  selfieBase64: string;
  callbackUrl?: string;
  env?: "sandbox" | "production";
}

export interface SmileSubmitResult {
  jobComplete: boolean;
  approved: boolean;
  resultText: string;
  rawResponse: unknown;
}

export async function submitToSmileId(params: SmileSubmitParams): Promise<SmileSubmitResult> {
  const { partnerId, apiKey, externalUserId, jobType, selfieBase64, callbackUrl, env = "sandbox" } = params;

  const baseUrl =
    env === "production"
      ? "https://api.smileidentity.com/v1"
      : "https://testapi.smileidentity.com/v1";

  const timestamp = new Date().toISOString();
  const signature = generateSmileSignature(apiKey, timestamp, partnerId);
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,")
  const cleanBase64 = selfieBase64.replace(/^data:[a-z/]+;base64,/, "");

  const payload = {
    smile_client_id: partnerId,
    partner_id: partnerId,
    signature,
    timestamp,
    source_sdk: "backend_web",
    source_sdk_version: "1.0.0",
    job_type: jobType,
    partner_params: {
      user_id: externalUserId,
      job_id: jobId,
      job_type: String(jobType),
    },
    callback_url: callbackUrl ?? "",
    return_job_status: true,
    return_history: false,
    return_images: false,
    images: [
      {
        image_type_id: 2,
        image: cleanBase64,
      },
    ],
  };

  const response = await fetch(`${baseUrl}/smile_jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw: unknown = await response.json().catch(() => ({}));
  const resultText = extractSmileStatusText(raw);
  const approved = isSmileApproved(raw) ?? false;
  const jobComplete = Boolean((raw as Record<string, unknown>).job_complete);

  return { jobComplete, approved, resultText, rawResponse: raw };
}
