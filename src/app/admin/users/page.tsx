import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import AdminUsersPanel from "./AdminUsersPanel";

const PAGE_SIZE = 50;

function calculateLoanProfit(amount: number, termDays: number) {
  const interest1 = amount * 0.05;
  const interest2 = termDays >= 60 ? amount * 0.03 : 0;
  const interest3 = termDays >= 90 ? amount * 0.02 : 0;
  const initiationFee = amount <= 1000 ? 150 : amount <= 1500 ? 200 : 300;
  const serviceFee = 60;
  return interest1 + interest2 + interest3 + initiationFee + serviceFee;
}

type Props = {
  searchParams: Promise<{ role?: string; page?: string }>;
};

function isMissingIsDeletedColumn(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof (error as { code?: unknown })?.code === "string"
    ? String((error as { code?: string }).code)
    : "";
  return code === "P2022" || message.includes("isdeleted") || message.includes("unknown argument `isdeleted`");
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { role: roleParam, page: pageParam } = await searchParams;
  const roleFilter: Role = roleParam === "ADMIN" ? "ADMIN" : "USER";
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const baseWhere = { role: roleFilter } as const;
  let supportsIsDeleted = true;
  let totalUsers: number;

  try {
    totalUsers = await prisma.user.count({ where: { ...baseWhere, isDeleted: false } as any });
  } catch (error) {
    if (!isMissingIsDeletedColumn(error)) {
      throw error;
    }
    supportsIsDeleted = false;
    totalUsers = await prisma.user.count({ where: baseWhere });
  }
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const users = supportsIsDeleted
    ? await prisma.user.findMany({
        where: { ...baseWhere, isDeleted: false } as any,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          points: true,
          persalNumber: true,
          phone: true,
          idNumber: true,
          bankName: true,
          accountNumber: true,
          bankVerified: true,
          isBurned: true,
          isDeleted: true,
          createdAt: true,
          applicationStatus: true,
          loans: {
            select: {
              amount: true,
              termDays: true,
              status: true,
              createdAt: true,
            },
          },
        } as any,
        orderBy: {
          createdAt: "desc",
        },
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
    : await prisma.user.findMany({
        where: baseWhere,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          points: true,
          persalNumber: true,
          phone: true,
          idNumber: true,
          bankName: true,
          accountNumber: true,
          bankVerified: true,
          isBurned: true,
          createdAt: true,
          loans: {
            select: {
              amount: true,
              termDays: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (safePage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });

  const usersData = users.map((user) => {
    const paidLoans = (user.loans ?? []).filter((loan) => loan.status === "PAID");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const paidLoans30Days = paidLoans.filter((loan) => loan.createdAt >= thirtyDaysAgo);

    const profitTotal = paidLoans.reduce(
      (sum, loan) => sum + calculateLoanProfit(loan.amount, loan.termDays),
      0
    );

    const profit30Days = paidLoans30Days.reduce(
      (sum, loan) => sum + calculateLoanProfit(loan.amount, loan.termDays),
      0
    );

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      points: user.points,
      persalNumber: user.persalNumber,
      phone: user.phone,
      idNumber: user.idNumber,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      isBurned: user.isBurned,
      isDeleted: Boolean((user as any).isDeleted),
      bankVerified: Boolean((user as any).bankVerified),
      paidLoanCount: paidLoans.length,
      profitTotal,
      profit30Days,
      joinedAt: user.createdAt.toISOString(),
      applicationStatus: (user as any).applicationStatus || null,
    };
  });

  // Fetch identity verification status for all users in one raw query
  const userIds = usersData.map((u) => u.id);
  let identityStatuses: Record<string, { faceIdEnrolled: boolean; faceIdStatus: string | null }> = {};
  try {
    const rows = await prisma.$queryRaw<{ id: string; faceIdEnrolled: boolean; faceIdStatus: string | null }[]>`
      SELECT id, "faceIdEnrolled", "faceIdStatus" FROM "User" WHERE id = ANY(${userIds})
    `;
    for (const row of rows) {
      identityStatuses[row.id] = { faceIdEnrolled: Boolean(row.faceIdEnrolled), faceIdStatus: row.faceIdStatus };
    }
  } catch {
    // Non-fatal: fields may not exist in older migrations
  }

  const usersWithVerification = usersData.map((u) => ({
    ...u,
    faceIdEnrolled: identityStatuses[u.id]?.faceIdEnrolled ?? false,
    faceIdStatus: identityStatuses[u.id]?.faceIdStatus ?? null,
  }));

  return (
    <section className="max-w-full mx-auto py-8 md:py-10 px-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-persal-blue">Users Details</h1>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
        >
          Back to Admin Panel
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-gray-600">
          Role: <span className="font-semibold text-gray-800">{roleFilter}</span> · Page {safePage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={
              safePage > 1
                ? `/admin/users?page=${safePage - 1}&role=${roleFilter}`
                : `/admin/users?page=1&role=${roleFilter}`
            }
            className={`px-3 py-1.5 rounded-md border text-sm ${safePage > 1 ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-200 text-gray-400 pointer-events-none"}`}
          >
            Previous
          </Link>
          <Link
            href={
              safePage < totalPages
                ? `/admin/users?page=${safePage + 1}&role=${roleFilter}`
                : `/admin/users?page=${totalPages}&role=${roleFilter}`
            }
            className={`px-3 py-1.5 rounded-md border text-sm ${safePage < totalPages ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-200 text-gray-400 pointer-events-none"}`}
          >
            Next
          </Link>
        </div>
      </div>

      <AdminUsersPanel users={usersWithVerification} />
    </section>
  );
}
