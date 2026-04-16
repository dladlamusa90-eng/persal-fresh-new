import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { sendSystemNotification } from "@/lib/systemNotifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
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

    const body = (await req.json()) as { points?: number };
    const points = Number(body.points);

    if (!Number.isInteger(points) || points < 0) {
      return NextResponse.json(
        { error: "Points must be a whole number greater than or equal to 0" },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, points: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pointsDelta = points - currentUser.points;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const userRecord = await tx.user.update({
        where: { id },
        data: { points },
        select: {
          id: true,
          points: true,
        },
      });

      if (pointsDelta !== 0) {
        try {
          await tx.userPointsEvent.create({
            data: {
              userId: id,
              type: "ADMIN_ADJUSTMENT",
              pointsDelta,
              balanceAfter: userRecord.points,
              description: "Adjusted by admin",
              actorUserId: session.user.id ?? null,
            },
          });
        } catch (eventError) {
          console.warn("[warn] admin-points-event-log-failed", {
            targetUserId: id,
            actorUserId: session.user.id,
            at: new Date().toISOString(),
            error: eventError instanceof Error ? eventError.message : "unknown",
          });
        }
      }

      return userRecord;
    });

    console.info("[audit] admin-user-points-update", {
      actorUserId: session.user.id,
      targetUserId: id,
      points,
      at: new Date().toISOString(),
    });

    if (pointsDelta !== 0) {
      const direction = pointsDelta > 0 ? "increased" : "reduced";
      const abs = Math.abs(pointsDelta);
      await sendSystemNotification(
        id,
        "Points updated",
        `Your points were ${direction} by ${abs}. New balance: ${points} point${points !== 1 ? "s" : ""}.`
      );
    }

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
