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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        faceIdEnrolled: true,
        faceIdExternalUserId: true,
        faceIdStatus: true,
        faceIdVerifiedAt: true,
        faceIdLastMatchPassed: true,
        faceIdLastMatchedAt: true,
        faceIdRegistrationPhoto: true,
      } as any,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const externalUserId = (user as any).faceIdExternalUserId || buildFaceIdExternalUserId(user.id);
    const enrolled = Boolean((user as any).faceIdEnrolled);
    const verifiedByStatus = isFaceIdVerified({
      faceIdStatus: (user as any).faceIdStatus,
      faceIdVerifiedAt: (user as any).faceIdVerifiedAt,
    });
    const faceIdLastMatchPassed = Boolean((user as any).faceIdLastMatchPassed);
    const faceIdLastMatchedAt = (user as any).faceIdLastMatchedAt as Date | string | null;
    const FACE_MATCH_VALID_MS = 15 * 60 * 1000;
    const liveMatchValid = Boolean(
      faceIdLastMatchPassed &&
      faceIdLastMatchedAt &&
      Date.now() - new Date(faceIdLastMatchedAt).getTime() <= FACE_MATCH_VALID_MS
    );
    const verified = Boolean(verifiedByStatus && liveMatchValid);

    if (!(user as any).faceIdExternalUserId) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          faceIdExternalUserId: externalUserId,
          faceIdStatus: verified ? "VERIFIED" : "PENDING",
          faceIdLastCheckedAt: new Date(),
        } as any,
      });
    }

    const verificationBaseUrl = process.env.SMILE_FACE_VERIFICATION_URL || process.env.NEXT_PUBLIC_SMILE_FACE_VERIFICATION_URL;

    return NextResponse.json(
      {
        verified,
        enrolled,
        liveMatchValid,
        hasRegistrationPhoto: Boolean((user as any).faceIdRegistrationPhoto),
        status: (user as any).faceIdStatus ?? "PENDING",
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
