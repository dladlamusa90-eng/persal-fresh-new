import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractSmileStatusText, isSmileApproved } from "@/lib/faceId";

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const partnerParams = (body.partner_params ?? body.partnerParams ?? {}) as Record<string, unknown>;
  const nested = (body.data ?? body.result ?? {}) as Record<string, unknown>;

  const externalUserId =
    String(
      partnerParams.user_id ??
        partnerParams.userId ??
        (nested.partner_params as Record<string, unknown> | undefined)?.user_id ??
        body.user_id ??
        ""
    ).trim();

  if (!externalUserId) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const approved = isSmileApproved(body) === true;
  const resultText = extractSmileStatusText(body);

  await prisma.user.updateMany({
    where: { faceIdExternalUserId: externalUserId },
    data: approved
      ? {
          faceIdEnrolled: true,
          faceIdStatus: "VERIFIED",
          faceIdVerifiedAt: new Date(),
          faceIdLastCheckedAt: new Date(),
          faceIdLastError: null,
          faceIdLastMatchPassed: true,
          faceIdLastMatchedAt: new Date(),
        }
      : {
          faceIdStatus: "ENROLLED",
          faceIdLastCheckedAt: new Date(),
          faceIdLastError: resultText || "verification_failed",
          faceIdLastMatchPassed: false,
        },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
