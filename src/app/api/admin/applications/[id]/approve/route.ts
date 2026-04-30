import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, applicationStatus: true, role: true } as any,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if ((user as any).role === "ADMIN") {
      return NextResponse.json({ error: "Cannot modify admin application status" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        applicationStatus: "APPROVED",
        applicationApprovedAt: new Date(),
        applicationRejectedAt: null,
        applicationRejectionReason: null,
      } as any,
    });

    return NextResponse.json({ message: "Application approved" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
