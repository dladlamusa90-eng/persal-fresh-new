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
  _status: "APPROVED" | "REJECTED"
) {
  // Email delivery is intentionally skipped until SMTP/provider setup is completed.
  return;
}

export async function POST(
  _req: NextRequest,
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
          applicationStatus: "APPROVED",
          applicationApprovedAt: new Date(),
          applicationRejectedAt: null,
          applicationRejectionReason: null,
        } as any,
      });
    } catch (error) {
      if (!isUnknownApplicationStatusArg(error)) {
        throw error;
      }

      await prisma.$executeRaw`
        UPDATE "User"
        SET
          "applicationStatus" = 'APPROVED'::"ApplicationStatus",
          "applicationApprovedAt" = NOW(),
          "applicationRejectedAt" = NULL,
          "applicationRejectionReason" = NULL
        WHERE "id" = ${userId}
      `;
    }

    void sendSystemNotification(
      user.id,
      "Application Approved",
      "Your account application has been approved. You can now log in and continue with your loan application."
    );

    if (user.phone) {
      void sendSms(
        user.phone,
        "Persal update: Your application has been approved. You can now log in and continue with your loan application."
      ).catch(() => {
        // Non-blocking: approval/rejection should not fail when SMS is not configured.
      });
    }

    void sendApplicationDecisionEmail(user.email, user.fullName, "APPROVED").catch(() => {
      // Non-blocking until email setup is available.
    });

    return NextResponse.json({ message: "Application approved" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
