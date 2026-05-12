import { createHmac } from "crypto";

export function isFaceIdVerified(user: { faceIdStatus?: string | null; faceIdVerifiedAt?: Date | string | null }): boolean {
  if (user.faceIdStatus !== "VERIFIED") return false;
  return Boolean(user.faceIdVerifiedAt);
}

export function buildFaceIdExternalUserId(userId: string): string {
  return `persal-${userId}`;
}

export function generateSmileSignature(apiKey: string, timestamp: string, partnerId: string): string {
  return createHmac("sha256", apiKey)
    .update(timestamp + partnerId + "sid_request")
    .digest("base64");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function extractSmileStatusText(raw: unknown): string {
  const top = asRecord(raw);
  const result = asRecord(top.result);
  const data = asRecord(top.data);

  const candidate =
    top.result_text ??
    top.message ??
    result.result_text ??
    result.message ??
    data.result_text ??
    data.message;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  return "verification_pending";
}

export function isSmileApproved(raw: unknown): boolean | null {
  const top = asRecord(raw);
  const result = asRecord(top.result);
  const data = asRecord(top.data);

  const boolCandidate =
    top.approved ??
    top.verified ??
    top.success ??
    result.approved ??
    result.verified ??
    result.success ??
    data.approved ??
    data.verified ??
    data.success;

  if (typeof boolCandidate === "boolean") {
    return boolCandidate;
  }

  const textCandidate =
    String(top.result_code ?? result.result_code ?? top.result_text ?? result.result_text ?? "").toUpperCase();

  if (!textCandidate) return null;
  if (textCandidate.includes("PASS") || textCandidate.includes("MATCH") || textCandidate.includes("APPROVED")) {
    return true;
  }
  if (textCandidate.includes("FAIL") || textCandidate.includes("NO_MATCH") || textCandidate.includes("REJECT")) {
    return false;
  }

  return null;
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
  const jobComplete = Boolean(asRecord(raw).job_complete);

  if (!response.ok && !approved) {
    return { jobComplete, approved: false, resultText, rawResponse: raw };
  }

  return { jobComplete, approved, resultText, rawResponse: raw };
}
