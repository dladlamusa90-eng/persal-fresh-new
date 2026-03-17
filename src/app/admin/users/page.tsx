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

  const where = { role: roleFilter };

  const totalUsers = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const users = await prisma.user.findMany({
    where,
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
    const paidLoans = user.loans.filter((loan) => loan.status === "PAID");
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
      paidLoanCount: paidLoans.length,
      profitTotal,
      profit30Days,
      joinedAt: user.createdAt.toISOString(),
    };
  });

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

      <AdminUsersPanel users={usersData} />
    </section>
  );
}
