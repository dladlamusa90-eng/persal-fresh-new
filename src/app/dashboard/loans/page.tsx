import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { calculateLoanCharges } from "@/lib/loanPolicy";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

function RepaymentBar({ amount, termDays, disbursementSentAt, status }: {
  amount: number;
  termDays: number;
  disbursementSentAt: Date | null;
  status: LoanStatus;
}) {
  if (status === "PENDING" || status === "REJECTED") {
    return (
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>—</span>
          <span>{status === "REJECTED" ? "Rejected" : "Awaiting approval"}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200" />
      </div>
    );
  }

  const { totalRepayable, monthlyRepayment } = calculateLoanCharges(amount, termDays);

  if (status === "PAID") {
    return (
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="text-teal-600 font-semibold">Fully repaid ✓</span>
          <span>R 0 remaining</span>
        </div>
        <div className="h-2 w-full rounded-full bg-teal-500" />
      </div>
    );
  }

  // APPROVED — estimate time-based progress
  const startDate = disbursementSentAt ?? new Date();
  const now = new Date();
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 86400000));
  const monthsElapsed = Math.floor(daysElapsed / 30);
  const estimatedPaid = Math.min(totalRepayable, monthlyRepayment * monthsElapsed);
  const remaining = Math.max(0, totalRepayable - estimatedPaid);
  const paidPct = Math.min(100, Math.round((estimatedPaid / totalRepayable) * 100));
  const timePct = Math.min(100, Math.round((daysElapsed / termDays) * 100));
  const urgency = timePct >= 80 ? "red" : timePct >= 50 ? "amber" : "green";
  const barColor = urgency === "red" ? "bg-red-500" : urgency === "amber" ? "bg-amber-400" : "bg-teal-500";
  const textColor = urgency === "red" ? "text-red-600" : urgency === "amber" ? "text-amber-600" : "text-teal-600";

  return (
    <div className="min-w-[160px]">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span className={`font-semibold ${textColor}`}>R {Math.round(remaining).toLocaleString()} left</span>
        <span>{paidPct}% repaid</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${paidPct}%` }} />
      </div>
    </div>
  );
}

export default async function MyLoansPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    redirect("/auth/login");
  }

  const loans = await prisma.loan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      termDays: true,
      status: true,
      createdAt: true,
      disbursementSentAt: true,
    },
  });

  return (
    <div className="bg-white rounded-2xl shadow p-4 md:p-8 border border-gray-200 w-full">
      <h2 className="text-lg md:text-xl font-bold text-persal-blue mb-4 md:mb-6">My Loans</h2>
      <div className="overflow-x-auto w-full">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-persal-dark border-b border-gray-200">
            <th className="py-2 px-4 text-left">Loan ID</th>
            <th className="py-2 px-4 text-left">Amount</th>
            <th className="py-2 px-4 text-left">Status</th>
            <th className="py-2 px-4 text-left">Repayment Progress</th>
            <th className="py-2 px-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 px-4 text-gray-500 text-center">No loans found.</td>
            </tr>
          ) : (
            loans.map((loan) => (
              <tr key={loan.id} className="border-b border-gray-100">
                <td className="py-3 px-4 font-mono text-xs text-gray-600">{loan.id.slice(0, 10)}…</td>
                <td className="py-3 px-4 font-semibold text-gray-900">R {loan.amount.toLocaleString()}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    loan.status === "APPROVED" ? "bg-green-50 text-green-700 border border-green-200" :
                    loan.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    loan.status === "PAID" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                    "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {loan.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <RepaymentBar
                    amount={loan.amount}
                    termDays={loan.termDays}
                    disbursementSentAt={loan.disbursementSentAt}
                    status={loan.status as LoanStatus}
                  />
                </td>
                <td className="py-3 px-4">
                  <Link
                    href="/dashboard/lending/application-status"
                    className="inline-block bg-teal-600 hover:bg-teal-700 text-white rounded px-3 py-2 md:py-1 text-xs font-semibold shadow w-full md:w-auto"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
