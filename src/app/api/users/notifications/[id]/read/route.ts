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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_: Request, context: RouteContext) {
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

    const { id } = await context.params;

    let notification: { id: string; userId: string } | null;

    try {
      notification = await (prisma as any).adminNotification.findUnique({
        where: { id },
        select: { id: true, userId: true },
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

      const fallbackRows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
        SELECT "id", "userId"
        FROM "AdminNotification"
        WHERE "id" = ${id}
        LIMIT 1
      `;
      notification = fallbackRows[0] ?? null;
    }

    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    let updated: { id: string; readAt: Date | null };

    try {
      updated = await (prisma as any).adminNotification.update({
        where: { id },
        data: { readAt: new Date() },
        select: { id: true, readAt: true },
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

      const fallbackUpdateRows = await prisma.$queryRaw<Array<{ id: string; readAt: Date | null }>>`
        UPDATE "AdminNotification"
        SET "readAt" = NOW()
        WHERE "id" = ${id}
        RETURNING "id", "readAt"
      `;

      if (!fallbackUpdateRows[0]) {
        throw error;
      }

      updated = fallbackUpdateRows[0];
    }

    return NextResponse.json({ notification: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
