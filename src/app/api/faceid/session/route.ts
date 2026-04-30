import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { buildFaceIdExternalUserId, isFaceIdVerified } from "@/lib/faceId";

function buildVerificationUrl(baseUrl: string, externalUserId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("user_id", externalUserId);
  url.searchParams.set("reference_id", `faceid-${Date.now()}`);
  return url.toString();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    type UserRow = {
      id: string;
      faceIdExternalUserId: string | null;
      faceIdStatus: string | null;
      faceIdVerifiedAt: Date | null;
      faceIdEnrolled: boolean;
      faceIdRegistrationPhoto: string | null;
      faceIdLastMatchPassed: boolean;
      faceIdLastMatchedAt: Date | null;
    };

    const rows = await prisma.$queryRaw<UserRow[]>`
      SELECT id, "faceIdExternalUserId", "faceIdStatus", "faceIdVerifiedAt",
             "faceIdEnrolled", "faceIdRegistrationPhoto",
             "faceIdLastMatchPassed", "faceIdLastMatchedAt"
      FROM "User" WHERE id = ${session.user.id} LIMIT 1
    `;
    const user = rows[0] ?? null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const externalUserId = user.faceIdExternalUserId || buildFaceIdExternalUserId(user.id);
    const enrolled = Boolean(user.faceIdEnrolled);
    const verifiedByStatus = isFaceIdVerified({
      faceIdStatus: user.faceIdStatus,
      faceIdVerifiedAt: user.faceIdVerifiedAt,
    });
    const FACE_MATCH_VALID_MS = 15 * 60 * 1000;
    const liveMatchValid = Boolean(
      user.faceIdLastMatchPassed &&
      user.faceIdLastMatchedAt &&
      Date.now() - new Date(user.faceIdLastMatchedAt).getTime() <= FACE_MATCH_VALID_MS
    );
    const verified = Boolean(verifiedByStatus && liveMatchValid);

    if (!user.faceIdExternalUserId) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "faceIdExternalUserId" = ${externalUserId},
            "faceIdStatus" = ${verified ? "VERIFIED" : "PENDING"},
            "faceIdLastCheckedAt" = NOW()
        WHERE id = ${user.id}
      `;
    }

    const verificationBaseUrl = process.env.SMILE_FACE_VERIFICATION_URL || process.env.NEXT_PUBLIC_SMILE_FACE_VERIFICATION_URL;

    return NextResponse.json(
      {
        verified,
        enrolled,
        liveMatchValid,
        hasRegistrationPhoto: Boolean(user.faceIdRegistrationPhoto),
        status: user.faceIdStatus ?? "PENDING",
        externalUserId,
        verificationUrl: verificationBaseUrl
          ? buildVerificationUrl(verificationBaseUrl, externalUserId)
          : null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
