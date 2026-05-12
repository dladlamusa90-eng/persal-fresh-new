import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import {
  buildFaceIdExternalUserId,
  submitToSmileId,
} from "@/lib/faceId";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as { selfieBase64?: string };
  const selfieBase64 = String(payload.selfieBase64 ?? "").trim();
  if (!selfieBase64 || selfieBase64.length < 100) {
    return NextResponse.json({ error: "A valid selfie image is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      faceIdExternalUserId: true,
      faceIdEnrolled: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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

  const externalUserId = user.faceIdExternalUserId || buildFaceIdExternalUserId(user.id);
  const jobType = user.faceIdEnrolled ? 2 : 4;
  if (!user.faceIdExternalUserId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { faceIdExternalUserId: externalUserId },
    });
  }

  try {
    const result = await submitToSmileId({
      partnerId,
      apiKey,
      externalUserId,
      jobType,
      selfieBase64,
      callbackUrl,
      env,
    });

    if (result.approved) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          faceIdEnrolled: true,
          faceIdStatus: "VERIFIED",
          faceIdVerifiedAt: new Date(),
          faceIdLastCheckedAt: new Date(),
          faceIdLastError: null,
          faceIdLastLivePhoto: selfieBase64,
          faceIdLastMatchPassed: true,
          faceIdLastMatchedAt: new Date(),
        },
      });

      return NextResponse.json({ verified: true, status: "VERIFIED" }, { status: 200 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        faceIdStatus: user.faceIdEnrolled ? "ENROLLED" : "PENDING",
        faceIdLastCheckedAt: new Date(),
        faceIdLastError: result.resultText || "verification_failed",
        faceIdLastLivePhoto: selfieBase64,
        faceIdLastMatchPassed: false,
      },
    });

    return NextResponse.json(
      { verified: false, status: user.faceIdEnrolled ? "ENROLLED" : "PENDING", reason: result.resultText },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "verification_error";

    await prisma.user.update({
      where: { id: user.id },
      data: {
        faceIdStatus: user.faceIdEnrolled ? "ENROLLED" : "PENDING",
        faceIdLastCheckedAt: new Date(),
        faceIdLastError: message,
      },
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
