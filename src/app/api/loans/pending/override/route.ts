import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "ADMIN") {
      return NextResponse.json({ error: "Admins cannot override loan applications" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await prisma.loan.updateMany({
      where: {
        userId: user.id,
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        rejectionReason: "Cancelled and replaced by a newer application",
      },
    });

    return NextResponse.json(
      {
        message: "Pending applications overridden",
        cancelledCount: result.count,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
