import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

function isMissingDeletedFieldError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? String((error as { code?: string }).code)
    : "";
  return code === "P2022" || message.includes("isdeleted") || message.includes("unknown argument `isdeleted`");
}

function isMissingNotificationsTableError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? String((error as { code?: string }).code)
    : "";
  return code === "P2021" || message.includes("adminnotification") || message.includes("does not exist in the current database");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await (async () => {
      try {
        return await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, role: true, isBurned: true, isDeleted: true },
        });
      } catch (error) {
        if (!isMissingDeletedFieldError(error)) {
          throw error;
        }

        const legacyUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, role: true, isBurned: true },
        });

        return legacyUser ? { ...legacyUser, isDeleted: false } : null;
      }
    })();

    if (!user || user.role !== "USER" || user.isBurned || (user as any).isDeleted) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let notifications: Array<{
      id: string;
      title: string;
      body: string;
      readAt: string | null;
      createdAt: string;
    }> = [];

    try {
      notifications = await (prisma as any).adminNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          body: true,
          readAt: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (isMissingNotificationsTableError(error)) {
        return NextResponse.json(
          {
            error: "Notifications are not available until database migrations are applied.",
          },
          { status: 503 }
        );
      }

      notifications = await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        body: string;
        readAt: string | null;
        createdAt: string;
      }>>`
        SELECT "id", "title", "body", "readAt", "createdAt"
        FROM "AdminNotification"
        WHERE "userId" = ${user.id}
        ORDER BY "createdAt" DESC
        LIMIT 30
      `;
    }

    const unreadCount = notifications.filter((item: { readAt: string | null }) => !item.readAt).length;

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await (async () => {
      try {
        return await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, role: true, isBurned: true, isDeleted: true },
        });
      } catch (error) {
        if (!isMissingDeletedFieldError(error)) {
          throw error;
        }

        const legacyUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, role: true, isBurned: true },
        });

        return legacyUser ? { ...legacyUser, isDeleted: false } : null;
      }
    })();

    if (!user || user.role !== "USER" || user.isBurned || (user as any).isDeleted) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await (prisma as any).adminNotification.updateMany({
        where: {
          userId: user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });
    } catch (error) {
      if (isMissingNotificationsTableError(error)) {
        return NextResponse.json(
          {
            error: "Notifications are not available until database migrations are applied.",
          },
          { status: 503 }
        );
      }

      await prisma.$executeRaw`
        UPDATE "AdminNotification"
        SET "readAt" = NOW()
        WHERE "userId" = ${user.id} AND "readAt" IS NULL
      `;
    }

    return NextResponse.json({ message: "All notifications marked as read" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
