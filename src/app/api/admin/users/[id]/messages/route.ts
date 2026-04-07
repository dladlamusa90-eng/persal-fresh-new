import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function POST(req: Request, context: RouteContext) {
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

    const body = (await req.json()) as { title?: string; message?: string };
    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const user = await (async () => {
      try {
        return await prisma.user.findUnique({
          where: { id },
          select: { id: true, role: true, isDeleted: true },
        });
      } catch (error) {
        if (!isMissingDeletedFieldError(error)) {
          throw error;
        }

        const legacyUser = await prisma.user.findUnique({
          where: { id },
          select: { id: true, role: true },
        });

        return legacyUser ? { ...legacyUser, isDeleted: false } : null;
      }
    })();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "Messages can only be sent to user accounts" }, { status: 400 });
    }

    if ((user as any).isDeleted) {
      return NextResponse.json({ error: "Cannot message a deleted user" }, { status: 400 });
    }

    let notification: {
      id: string;
      title: string;
      body: string;
      createdAt: Date;
    };

    try {
      notification = await (prisma as any).adminNotification.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          title,
          body: message,
          type: "MESSAGE",
          createdById: session.user.id,
        },
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (isMissingNotificationsTableError(error)) {
        return NextResponse.json(
          {
            error: "Messaging is not available until database migrations are applied (AdminNotification table missing).",
          },
          { status: 503 }
        );
      }

      // Fallback to raw SQL in case Prisma model operations fail unexpectedly.
      const fallbackId = randomUUID();
      const fallbackRows = await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        body: string;
        createdAt: Date;
      }>>`
        INSERT INTO "AdminNotification" ("id", "userId", "type", "title", "body", "createdById", "createdAt")
        VALUES (${fallbackId}, ${user.id}, CAST('MESSAGE' AS "AdminNotificationType"), ${title}, ${message}, ${session.user.id ?? null}, NOW())
        RETURNING "id", "title", "body", "createdAt"
      `;

      if (!fallbackRows[0]) {
        throw error;
      }

      notification = fallbackRows[0];
    }

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("[admin-messages] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
