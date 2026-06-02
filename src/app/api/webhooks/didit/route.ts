import crypto from "node:crypto";
import prisma from "@/lib/prisma";

// Convert whole-number floats to integers (Didit V2 canonical requirement)
function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v !== null && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, shortenFloats(x)])
    );
  }
  if (typeof v === "number" && !Number.isInteger(v) && v % 1 === 0) return Math.trunc(v);
  return v;
}

// Recursively sort object keys (arrays preserved in insertion order)
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === "object") {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export async function POST(req: Request) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("DIDIT_WEBHOOK_SECRET not configured");
    return new Response("misconfigured", { status: 500 });
  }

  const raw = await req.text();
  const sig = req.headers.get("x-signature-v2") ?? "";
  const ts = Number(req.headers.get("x-timestamp") ?? "0");

  // Replay protection: reject if timestamp is more than 5 minutes old
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response("stale timestamp", { status: 401 });
  }

  // Verify HMAC-SHA256 signature using canonical V2 JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));
  const expected = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex");

  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(sig, "utf8"))
  ) {
    return new Response("bad signature", { status: 401 });
  }

  const event = parsed as {
    session_id?: string;
    status?: string;
    webhook_type?: string;
    vendor_data?: string;
    timestamp?: number;
  };

  const { session_id, status, webhook_type, vendor_data } = event;

  // Only process status change events
  if (!webhook_type?.includes("status") || !session_id || !vendor_data || !status) {
    return new Response("ok", { status: 200 });
  }

  const now = new Date();

  try {
    switch (status) {
      case "Approved":
        await prisma.user.update({
          where: { id: vendor_data },
          data: {
            faceIdStatus: "VERIFIED",
            faceIdVerifiedAt: now,
            faceIdLastCheckedAt: now,
            faceIdEnrolled: true,
            faceIdLastMatchPassed: true,
            faceIdLastError: null,
            faceIdExternalUserId: session_id,
          },
        });
        break;

      case "Declined":
        await prisma.user.update({
          where: { id: vendor_data },
          data: {
            faceIdStatus: "DECLINED",
            faceIdLastCheckedAt: now,
            faceIdLastMatchPassed: false,
            faceIdLastError: "Verification declined by automated review",
            faceIdExternalUserId: session_id,
          },
        });
        break;

      case "In Review":
        await prisma.user.update({
          where: { id: vendor_data },
          data: {
            faceIdStatus: "IN_REVIEW",
            faceIdLastCheckedAt: now,
            faceIdExternalUserId: session_id,
          },
        });
        break;

      case "In Progress":
      case "Not Started":
      case "Awaiting User":
        await prisma.user.update({
          where: { id: vendor_data },
          data: {
            faceIdStatus: "IN_PROGRESS",
            faceIdLastCheckedAt: now,
            faceIdExternalUserId: session_id,
          },
        });
        break;

      // Abandoned / Expired / Resubmitted — no DB change needed, just acknowledge
      default:
        break;
    }
  } catch (err) {
    // Log but return 200 so Didit does not retry unnecessarily for non-retryable errors
    console.error("Didit webhook DB update failed:", err, { session_id, status, vendor_data });
  }

  return new Response("ok", { status: 200 });
}
