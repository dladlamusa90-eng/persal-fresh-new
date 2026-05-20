import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { sendSystemNotification } from "@/lib/systemNotifications";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: userId } = await params;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { applicationStatus: "REJECTED", applicationRejectedAt: new Date() },
  });
  void sendSystemNotification(
    userId,
    "Persal Number Rejected",
    "Your Persal number was rejected. Please check and resubmit."
  );
  return NextResponse.json({ message: "Persal rejected" }, { status: 200 });
}
