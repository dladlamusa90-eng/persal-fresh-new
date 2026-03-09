import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { points },
      select: {
        id: true,
        points: true,
      },
    });

    console.info("[audit] admin-user-points-update", {
      actorUserId: session.user.id,
      targetUserId: id,
      points,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
