import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isMissingTableError(error: unknown) {
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? String((error as { code?: string }).code)
    : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return code === "P2021" || message.includes("does not exist");
}

function isMissingDeletedColumnsError(error: unknown) {
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? String((error as { code?: string }).code)
    : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return code === "P2022" || message.includes("isdeleted") || message.includes("deletedat");
}

export async function DELETE(req: Request, context: RouteContext) {
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

    let preserveProfitRecords = false;
    let clearRecordsOnly = false;

    try {
      const body = (await req.json()) as { preserveProfitRecords?: boolean; clearRecordsOnly?: boolean };
      preserveProfitRecords = Boolean(body?.preserveProfitRecords);
      clearRecordsOnly = Boolean(body?.clearRecordsOnly);
    } catch {
      preserveProfitRecords = false;
      clearRecordsOnly = false;
    }

    if (clearRecordsOnly) {
      await prisma.$transaction(async (tx) => {
        await tx.loginOtp.deleteMany({ where: { userId: id } });
        await tx.passwordResetOtp.deleteMany({ where: { userId: id } });
        try {
          await tx.adminNotification.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        try {
          await tx.userPointsEvent.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        try {
          await tx.loanApplicationDraft.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        await tx.loan.deleteMany({ where: { userId: id } });
        await tx.user.update({
          where: { id },
          data: {
            points: 0,
          },
        });
      });
    } else if (preserveProfitRecords) {
      const deletedEmail = `deleted+${id}@deleted.local`;

      await prisma.$transaction(async (tx) => {
        await tx.loginOtp.deleteMany({ where: { userId: id } });
        await tx.passwordResetOtp.deleteMany({ where: { userId: id } });
        try {
          await tx.loanApplicationDraft.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        try {
          await tx.userPointsEvent.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }

        const softDeleteData = {
          fullName: "Deleted User",
          email: deletedEmail,
          persalNumber: null,
          phone: null,
          idNumber: null,
          bankName: null,
          accountNumber: null,
          accountType: null,
          branchCode: null,
          profileImage: null,
          address: null,
          points: 0,
          isBurned: true,
          burnedAt: new Date(),
          isDeleted: true,
          deletedAt: new Date(),
          password: `deleted-${id}-${Date.now()}`,
        } as any;

        try {
          await tx.user.update({ where: { id }, data: softDeleteData });
        } catch (error) {
          if (!isMissingDeletedColumnsError(error)) throw error;

          await tx.user.update({
            where: { id },
            data: {
              fullName: "Deleted User",
              email: deletedEmail,
              persalNumber: null,
              phone: null,
              idNumber: null,
              bankName: null,
              accountNumber: null,
              accountType: null,
              branchCode: null,
              profileImage: null,
              address: null,
              points: 0,
              isBurned: true,
              burnedAt: new Date(),
              password: `deleted-${id}-${Date.now()}`,
            } as any,
          });
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.loginOtp.deleteMany({ where: { userId: id } });
        await tx.passwordResetOtp.deleteMany({ where: { userId: id } });
        try {
          await tx.adminNotification.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        try {
          await tx.userPointsEvent.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        try {
          await tx.loanApplicationDraft.deleteMany({ where: { userId: id } });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
        }
        await tx.loan.deleteMany({ where: { userId: id } });

        const deleteCount = await tx.$executeRaw`
          DELETE FROM "User" WHERE "id" = ${id}
        `;

        if (Number(deleteCount) !== 1) {
          throw new Error("User row was not deleted");
        }
      });

      const stillExists = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (stillExists) {
        return NextResponse.json({ error: "Failed to fully remove user from database" }, { status: 500 });
      }
    }

    console.info("[audit] admin-user-clear", {
      actorUserId: session.user.id,
      targetUserId: id,
      preserveProfitRecords,
      clearRecordsOnly,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[admin-user-clear] delete failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
