import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }

    if (session.user.id === id) {
      return NextResponse.json({ error: "You cannot clear your own admin account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Admin accounts cannot be cleared" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.loginOtp.deleteMany({ where: { userId: id } }),
      prisma.passwordResetOtp.deleteMany({ where: { userId: id } }),
      prisma.loan.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    console.info("[audit] admin-user-clear", {
      actorUserId: session.user.id,
      targetUserId: id,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
