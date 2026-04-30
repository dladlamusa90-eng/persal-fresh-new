import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { extractSmileExternalUserId, extractSmileStatusText, isSmileApproved } from "@/lib/faceId";

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));

    const externalUserId = extractSmileExternalUserId(payload);
    const approved = isSmileApproved(payload);
    const statusText = extractSmileStatusText(payload);

    if (!externalUserId) {
      return NextResponse.json({ ok: true, ignored: "missing_user_id" }, { status: 200 });
    }

    const user = await prisma.user.findFirst({
      where: { faceIdExternalUserId: externalUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: true, ignored: "unknown_user" }, { status: 200 });
    }

    if (approved === true) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          faceIdStatus: "VERIFIED",
          faceIdVerifiedAt: new Date(),
          faceIdLastCheckedAt: new Date(),
          faceIdLastError: null,
        } as any,
      });
      return NextResponse.json({ ok: true, status: "VERIFIED" }, { status: 200 });
    }

    if (approved === false) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          faceIdStatus: "FAILED",
          faceIdLastCheckedAt: new Date(),
          faceIdLastError: statusText || "face_verification_failed",
        } as any,
      });
      return NextResponse.json({ ok: true, status: "FAILED" }, { status: 200 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        faceIdStatus: "PENDING",
        faceIdLastCheckedAt: new Date(),
      } as any,
    });

    return NextResponse.json({ ok: true, status: "PENDING" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
