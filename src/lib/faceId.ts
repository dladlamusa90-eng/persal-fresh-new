import { WebApi } from "smile-identity-core";

export function isFaceIdVerified(user: { faceIdStatus?: string | null; faceIdVerifiedAt?: Date | string | null }): boolean {
  if (user.faceIdStatus !== "VERIFIED") return false;
  return Boolean(user.faceIdVerifiedAt);
}

export function buildFaceIdExternalUserId(userId: string): string {
  return `persal-${userId}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function extractSmileStatusText(raw: unknown): string {
  const top = asRecord(raw);
  const result = asRecord(top.result);
  const data = asRecord(top.data);
  const nestedResult = asRecord(data.result);

  const candidate =
    top.result_text ??
    top.ResultText ??
    top.message ??
    top.Message ??
    result.result_text ??
    result.ResultText ??
    result.message ??
    result.Message ??
    data.result_text ??
    data.ResultText ??
    data.message ??
    data.Message ??
    nestedResult.result_text ??
    nestedResult.ResultText ??
    nestedResult.message ??
    nestedResult.Message;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  return "verification_pending";
}

export function isSmileApproved(raw: unknown): boolean | null {
  const top = asRecord(raw);
  const result = asRecord(top.result);
  const data = asRecord(top.data);
  const nestedResult = asRecord(data.result);

  const boolCandidate =
    top.approved ??
    top.verified ??
    top.success ??
    top.job_success ??
    result.approved ??
    result.verified ??
    result.success ??
    result.job_success ??
    data.approved ??
    data.verified ??
    data.success ??
    data.job_success ??
    nestedResult.approved ??
    nestedResult.verified ??
    nestedResult.success ??
    nestedResult.job_success;

  if (typeof boolCandidate === "boolean") {
    return boolCandidate;
  }

  const textCandidate =
    String(
      top.result_code ??
        top.ResultCode ??
        result.result_code ??
        result.ResultCode ??
        nestedResult.result_code ??
        nestedResult.ResultCode ??
        top.result_text ??
        top.ResultText ??
        result.result_text ??
        result.ResultText ??
        nestedResult.result_text ??
        nestedResult.ResultText ??
        ""
    ).toUpperCase();

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
  jobType: 2 | 4;
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
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cleanBase64 = selfieBase64.replace(/^data:[a-z/]+;base64,/, "");
  const webApi = new WebApi(partnerId, callbackUrl || null, apiKey, env === "production" ? 1 : 0);
  const raw = await webApi.submit_job(
    {
      user_id: externalUserId,
      job_id: jobId,
      job_type: jobType,
    },
    [
      {
        image_type_id: 2,
        image: cleanBase64,
      },
    ],
    { entered: false },
    {
      optional_callback: callbackUrl,
      return_job_status: true,
      return_history: false,
      return_images: false,
      use_enrolled_image: false,
    }
  );

  const resultText = extractSmileStatusText(raw);
  const approved = isSmileApproved(raw) ?? false;
  const jobComplete = Boolean(asRecord(raw).job_complete);

  return { jobComplete, approved, resultText, rawResponse: raw };
}
