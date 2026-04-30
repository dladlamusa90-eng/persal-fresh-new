import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendSystemNotification } from "@/lib/systemNotifications";

function isUnknownApplicationStatusArg(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("unknown argument `applicationstatus`");
}

async function sendApplicationDecisionEmail(
  _to: string,
  _fullName: string,
  _status: "APPROVED" | "REJECTED",
  _reason?: string | null
) {
  // Email delivery is intentionally skipped until SMTP/provider setup is completed.
  return;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = (await req.json()) as { reason?: string };
    const reason = String(body.reason ?? "").trim() || null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if ((user as any).role === "ADMIN") {
      return NextResponse.json({ error: "Cannot modify admin application status" }, { status: 400 });
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          applicationStatus: "REJECTED",
          applicationRejectedAt: new Date(),
          applicationApprovedAt: null,
          applicationRejectionReason: reason,
        } as any,
      });
    } catch (error) {
      if (!isUnknownApplicationStatusArg(error)) {
        throw error;
      }

      await prisma.$executeRaw`
        UPDATE "User"
        SET
          "applicationStatus" = 'REJECTED'::"ApplicationStatus",
          "applicationRejectedAt" = NOW(),
          "applicationApprovedAt" = NULL,
          "applicationRejectionReason" = ${reason}
        WHERE "id" = ${userId}
      `;
    }

    void sendSystemNotification(
      user.id,
      "Application Update",
      reason
        ? `Your account application was not approved. Reason: ${reason}`
        : "Your account application was not approved. Please contact support for assistance."
    );

    if (user.phone) {
      void sendSms(
        user.phone,
        reason
          ? `Persal update: Your application was not approved. Reason: ${reason}`
          : "Persal update: Your application was not approved. Please contact support for assistance."
      ).catch(() => {
        // Non-blocking: approval/rejection should not fail when SMS is not configured.
      });
    }

    void sendApplicationDecisionEmail(user.email, user.fullName, "REJECTED", reason).catch(() => {
      // Non-blocking until email setup is available.
    });

    return NextResponse.json({ message: "Application rejected" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
