import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { isFaceIdVerified } from "@/lib/faceId";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      faceIdStatus: true,
      faceIdEnrolled: true,
      faceIdVerifiedAt: true,
      faceIdLastCheckedAt: true,
      faceIdLastError: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      verified: isFaceIdVerified(user),
      enrolled: Boolean(user.faceIdEnrolled),
      status: user.faceIdStatus ?? null,
      lastCheckedAt: user.faceIdLastCheckedAt ?? null,
      lastError: user.faceIdLastError ?? null,
    },
    { status: 200 }
  );
}
