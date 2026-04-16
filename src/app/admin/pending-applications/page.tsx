import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import PendingApplicationsTable from "@/app/admin/pending-applications/PendingApplicationsTable";
import {
  MIN_DISPOSABLE_INCOME_FOR_LOAN,
  getDisposableIncomeEligibility,
  getMaxLoanForUser,
} from "@/lib/loanPolicy";

export default async function PendingApplicationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const pendingLoans = await prisma.loan.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          persalNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingUserIds = Array.from(new Set(pendingLoans.map((loan) => loan.userId)));
  const loanCountsByUser = pendingUserIds.length
    ? await prisma.loan.groupBy({
      by: ["userId"],
      where: {
        userId: {
          in: pendingUserIds,
        },
      },
      _count: {
        _all: true,
      },
    })
    : [];
  const loanCountMap = new Map(loanCountsByUser.map((entry) => [entry.userId, entry._count._all]));

  const pendingLoansData = pendingLoans.map((loan) => ({
    previousLoanCount: loanCountMap.get(loan.userId) ?? 1,
    id: loan.id,
    applicantName: loan.user.fullName,
    applicantEmail: loan.applicantEmail ?? loan.user.email ?? "No email",
    persalNumber: loan.user.persalNumber ?? "N/A",
    amount: loan.amount,
    termDays: loan.termDays,
    disposableIncome: loan.disposableIncome,
    createdAt: loan.createdAt.toISOString(),
  })).map((loan) => {
    const maxByProfile = getMaxLoanForUser(loan.previousLoanCount > 1);
    const affordability = getDisposableIncomeEligibility(loan.disposableIncome ?? 0, loan.amount, maxByProfile);
    const ineligibleReason =
      (loan.disposableIncome ?? 0) < MIN_DISPOSABLE_INCOME_FOR_LOAN
        ? "Disposable income below R1000"
        : !affordability.eligible
          ? "Requested amount exceeds 25% of disposable income"
          : null;

    return {
      id: loan.id,
      applicantName: loan.applicantName,
      applicantEmail: loan.applicantEmail,
      persalNumber: loan.persalNumber,
      amount: loan.amount,
      termDays: loan.termDays,
      disposableIncome: loan.disposableIncome,
      affordabilityMax: affordability.maxAllowed,
      ineligibleReason,
      createdAt: loan.createdAt,
    };
  });

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 py-4 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-100/90">Pending Queue</p>
            <h1 className="mt-1 text-xl md:text-2xl font-bold text-white">All Pending Applications</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-100/85">
              Total pending applications: <span className="font-semibold">{pendingLoans.length}</span>
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
          >
            Back to Dashboard
          </Link>
        </div>

        <PendingApplicationsTable loans={pendingLoansData} />
      </div>
    </section>
  );
}
