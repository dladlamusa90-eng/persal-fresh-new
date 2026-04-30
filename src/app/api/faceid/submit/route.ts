import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { buildFaceIdExternalUserId, submitToSmileId } from "@/lib/faceId";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { selfie?: string; jobType?: number };
    const { selfie, jobType } = body;

    if (!selfie || typeof selfie !== "string" || selfie.length < 100) {
      return NextResponse.json({ error: "Selfie image is required." }, { status: 400 });
    }

    if (jobType !== 1 && jobType !== 2) {
      return NextResponse.json({ error: "Invalid job type." }, { status: 400 });
    }

    const partnerId = process.env.SMILE_PARTNER_ID;
    const apiKey = process.env.SMILE_API_KEY;
    const callbackUrl = process.env.SMILE_CALLBACK_URL ?? "";
    const env = (process.env.SMILE_ENV === "production" ? "production" : "sandbox") as "sandbox" | "production";

    if (!partnerId || !apiKey) {
      return NextResponse.json(
        { error: "Face verification is not configured. Please contact support." },
        { status: 503 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        faceIdExternalUserId: true,
        faceIdRegistrationPhoto: true,
      } as any,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const externalUserId =
      (user as any).faceIdExternalUserId || buildFaceIdExternalUserId(user.id);

    if (!(user as any).faceIdExternalUserId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { faceIdExternalUserId: externalUserId, faceIdStatus: "PENDING" } as any,
      });
    }

    const result = await submitToSmileId({
      partnerId,
      apiKey,
      externalUserId,
      jobType: jobType as 1 | 2,
      selfieBase64: selfie,
      callbackUrl,
      env,
    });

    if (jobType === 1) {
      // Enrollment
      if (result.approved) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            faceIdEnrolled: true,
            faceIdStatus: "ENROLLED",
            faceIdVerifiedAt: new Date(),
            faceIdLastCheckedAt: new Date(),
            faceIdLastError: null,
            faceIdRegistrationPhoto: (user as any).faceIdRegistrationPhoto || selfie,
            faceIdLastMatchPassed: false,
            faceIdLastMatchedAt: null,
            faceIdLastLivePhoto: null,
          } as any,
        });
        return NextResponse.json({
          verified: false,
          enrolled: true,
          message: "Face registration complete. Authenticate once more to match against your registered face.",
        });
      }

      // Enrollment submitted but not yet approved (async callback expected)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          faceIdStatus: "PENDING",
          faceIdLastCheckedAt: new Date(),
          faceIdLastError: result.resultText || "enrollment_pending",
          faceIdLastMatchPassed: false,
        } as any,
      });
      return NextResponse.json(
        { verified: false, enrolled: false, error: "Face registration failed. Please ensure good lighting, no glasses, and try again." },
        { status: 200 }
      );
    } else {
      // Authentication (Job Type 2)
      if (result.approved) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            faceIdStatus: "VERIFIED",
            faceIdVerifiedAt: new Date(),
            faceIdLastCheckedAt: new Date(),
            faceIdLastError: null,
            faceIdLastLivePhoto: selfie,
            faceIdLastMatchPassed: true,
            faceIdLastMatchedAt: new Date(),
          } as any,
        });
        return NextResponse.json({ verified: true, enrolled: true, message: "Face verified successfully." });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          faceIdStatus: "FAILED",
          faceIdLastCheckedAt: new Date(),
          faceIdLastError: result.resultText || "authentication_failed",
          faceIdLastMatchPassed: false,
          faceIdLastMatchedAt: new Date(),
          faceIdLastLivePhoto: selfie,
        } as any,
      });
      return NextResponse.json(
        {
          verified: false,
          enrolled: true,
          error:
            "Face authentication failed. Your live face does not match your registered face. Please use good lighting, look straight at the camera, and try again.",
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("[faceid] submit error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
