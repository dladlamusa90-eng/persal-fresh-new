import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import AdminLoansPanel from "@/app/admin/AdminLoansPanel";
import AdminUsersPanel from "@/app/admin/users/AdminUsersPanel";

function calculateLoanProfit(amount: number, termDays: number) {
  const interest1 = amount * 0.05;
  const interest2 = termDays >= 60 ? amount * 0.03 : 0;
  const interest3 = termDays >= 90 ? amount * 0.02 : 0;
  const initiationFee = amount <= 1000 ? 150 : amount <= 1500 ? 200 : 300;
  const serviceFee = 60;
  return interest1 + interest2 + interest3 + initiationFee + serviceFee;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [loans, users] = await Promise.all([
    prisma.loan.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            persalNumber: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.findMany({
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
    }),
  ]);

  const nonAdminUsers = users.filter((user) => user.role === "USER");
  const totalUsers = nonAdminUsers.length;
  const totalAdmins = users.filter((user) => user.role === "ADMIN").length;

  const initialLoans = loans.map((loan) => ({
    id: loan.id,
    applicantName: loan.user.fullName,
    applicantEmail: loan.applicantEmail ?? loan.user.email,
    persalNumber: loan.user.persalNumber,
    amount: loan.amount,
    termDays: loan.termDays,
    grossSalary: loan.grossSalary,
    disposableIncome: loan.disposableIncome,
    disbursementSentAt: loan.disbursementSentAt?.toISOString() ?? null,
    status: loan.status,
    rejectionReason: loan.rejectionReason,
    createdAt: loan.createdAt.toISOString(),
  }));

  const usersData = nonAdminUsers.map((user) => {
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
      <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue">
        <div className="px-6 md:px-8 py-7 md:py-9">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-slate-200/90">Operations Center</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="mt-2 text-sm md:text-base text-slate-100/90 max-w-2xl">
                Review applications, make decisions confidently, and complete transfers from one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/users?role=USER"
                className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-persal-dark hover:bg-slate-100 transition"
              >
                Open Users Directory
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-white/35 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition"
              >
                Exit Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      <AdminLoansPanel
        initialLoans={initialLoans}
        totalAdmins={totalAdmins}
      />

      <AdminUsersPanel users={usersData} />
    </section>
  );
}
