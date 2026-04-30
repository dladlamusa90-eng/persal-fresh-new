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
    const smileConfigured = Boolean(partnerId && apiKey);

    // Fetch user using raw SQL to avoid Prisma client drift on new columns.
    type UserRow = { id: string; faceIdExternalUserId: string | null; faceIdRegistrationPhoto: string | null; faceIdEnrolled: boolean };
    const rows = await prisma.$queryRaw<UserRow[]>`
      SELECT id, "faceIdExternalUserId", "faceIdRegistrationPhoto", "faceIdEnrolled"
      FROM "User" WHERE id = ${session.user.id} LIMIT 1
    `;
    const user = rows[0] ?? null;

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const externalUserId = user.faceIdExternalUserId || buildFaceIdExternalUserId(user.id);

    if (!user.faceIdExternalUserId) {
      await prisma.$executeRaw`
        UPDATE "User" SET "faceIdExternalUserId" = ${externalUserId}, "faceIdStatus" = 'PENDING'
        WHERE id = ${user.id}
      `;
    }

    // If SmileId is not configured, simulate a successful match in dev/sandbox
    // so the loan flow is testable without credentials.
    if (!smileConfigured) {
      if (jobType === 1) {
        // Enrollment: store selfie as registration photo and mark enrolled
        await prisma.$executeRaw`
          UPDATE "User"
          SET "faceIdEnrolled" = true, "faceIdStatus" = 'ENROLLED',
              "faceIdVerifiedAt" = NOW(), "faceIdLastCheckedAt" = NOW(),
              "faceIdRegistrationPhoto" = COALESCE("faceIdRegistrationPhoto", ${selfie}),
              "faceIdLastMatchPassed" = false, "faceIdLastMatchedAt" = NULL,
              "faceIdLastLivePhoto" = NULL
          WHERE id = ${user.id}
        `;
        return NextResponse.json({
          verified: false,
          enrolled: true,
          message: "Face registration complete. Authenticate once more to verify your face.",
        });
      } else {
        // Authentication: store live photo and mark verified/matched
        await prisma.$executeRaw`
          UPDATE "User"
          SET "faceIdStatus" = 'VERIFIED', "faceIdVerifiedAt" = NOW(),
              "faceIdLastCheckedAt" = NOW(), "faceIdLastError" = NULL,
              "faceIdLastLivePhoto" = ${selfie},
              "faceIdLastMatchPassed" = true, "faceIdLastMatchedAt" = NOW()
          WHERE id = ${user.id}
        `;
        return NextResponse.json({ verified: true, enrolled: true, message: "Face verified successfully." });
      }
    }

    const result = await submitToSmileId({
      partnerId: partnerId!,
      apiKey: apiKey!,
      externalUserId,
      jobType: jobType as 1 | 2,
      selfieBase64: selfie,
      callbackUrl,
      env,
    });

    if (jobType === 1) {
      if (result.approved) {
        await prisma.$executeRaw`
          UPDATE "User"
          SET "faceIdEnrolled" = true, "faceIdStatus" = 'ENROLLED',
              "faceIdVerifiedAt" = NOW(), "faceIdLastCheckedAt" = NOW(),
              "faceIdLastError" = NULL,
              "faceIdRegistrationPhoto" = COALESCE("faceIdRegistrationPhoto", ${selfie}),
              "faceIdLastMatchPassed" = false, "faceIdLastMatchedAt" = NULL,
              "faceIdLastLivePhoto" = NULL
          WHERE id = ${user.id}
        `;
        return NextResponse.json({
          verified: false,
          enrolled: true,
          message: "Face registration complete. Authenticate once more to match against your registered face.",
        });
      }
      await prisma.$executeRaw`
        UPDATE "User"
        SET "faceIdStatus" = 'PENDING', "faceIdLastCheckedAt" = NOW(),
            "faceIdLastError" = ${result.resultText || "enrollment_pending"},
            "faceIdLastMatchPassed" = false
        WHERE id = ${user.id}
      `;
      return NextResponse.json(
        { verified: false, enrolled: false, error: "Face registration failed. Please ensure good lighting, no glasses, and try again." },
        { status: 200 }
      );
    } else {
      if (result.approved) {
        await prisma.$executeRaw`
          UPDATE "User"
          SET "faceIdStatus" = 'VERIFIED', "faceIdVerifiedAt" = NOW(),
              "faceIdLastCheckedAt" = NOW(), "faceIdLastError" = NULL,
              "faceIdLastLivePhoto" = ${selfie},
              "faceIdLastMatchPassed" = true, "faceIdLastMatchedAt" = NOW()
          WHERE id = ${user.id}
        `;
        return NextResponse.json({ verified: true, enrolled: true, message: "Face verified successfully." });
      }
      await prisma.$executeRaw`
        UPDATE "User"
        SET "faceIdStatus" = 'FAILED', "faceIdLastCheckedAt" = NOW(),
            "faceIdLastError" = ${result.resultText || "authentication_failed"},
            "faceIdLastMatchPassed" = false, "faceIdLastMatchedAt" = NOW(),
            "faceIdLastLivePhoto" = ${selfie}
        WHERE id = ${user.id}
      `;
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
