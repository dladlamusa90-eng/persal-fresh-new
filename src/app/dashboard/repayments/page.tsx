import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { calculateLoanCharges, getTermEndDate } from "@/lib/loanPolicy";

export default async function RepaymentsPage() {
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

  const latestLoan = await prisma.loan.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      amount: true,
      status: true,
      termDays: true,
      createdAt: true,
    },
  });

  const repayments = latestLoan
    ? [
        {
          date: getTermEndDate(latestLoan.createdAt, latestLoan.termDays).toISOString().slice(0, 10),
          amount: `R ${calculateLoanCharges(latestLoan.amount, latestLoan.termDays).totalRepayable.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`,
          status: latestLoan.status === "PAID" ? "Paid" : "Upcoming",
        },
      ]
    : [];

  return (
    <div className="bg-white rounded-2xl shadow p-8 border border-gray-200">
      <h2 className="text-xl font-bold text-persal-blue mb-6">Repayment Schedule</h2>
      {repayments.length === 0 ? (
        <p className="text-gray-500">No repayment schedule available yet.</p>
      ) : (
        <ul className="space-y-4">
          {repayments.map((repayment, index) => (
            <li key={`${repayment.date}-${index}`} className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="text-persal-dark font-medium">{repayment.date}</div>
                <div className="text-xs text-gray-500">Amount: {repayment.amount}</div>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-semibold ${repayment.status === "Paid" ? "bg-green-100 text-green-700" : "bg-blue-100 text-persal-blue"}`}>{repayment.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
