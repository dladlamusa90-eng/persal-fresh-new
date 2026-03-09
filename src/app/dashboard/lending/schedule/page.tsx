import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { calculateLoanCharges, getTermEndDate } from "@/lib/loanPolicy";

export default async function SchedulePage() {
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

  const loan = await prisma.loan.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      amount: true,
      termDays: true,
      status: true,
      createdAt: true,
    },
  });

  const schedule = loan
    ? [
        (() => {
          const charges = calculateLoanCharges(loan.amount, loan.termDays);
          return {
            month: getTermEndDate(loan.createdAt, loan.termDays).toISOString().slice(0, 10),
            payment: charges.totalRepayable,
            principal: loan.amount,
            interest: charges.totalCost,
            balance: 0,
            status: loan.status,
          };
        })(),
      ]
    : [];

  return (
    <section className="max-w-3xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Repayment Schedule</h2>
      {schedule.length === 0 ? (
        <p className="text-gray-500">No schedule available yet.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl shadow border border-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs text-gray-500">Month</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Payment</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Principal</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Interest</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-2 text-sm">{row.month}</td>
                <td className="px-4 py-2 text-sm">R {row.payment.toLocaleString("en-US")}</td>
                <td className="px-4 py-2 text-sm">R {row.principal.toLocaleString("en-US")}</td>
                <td className="px-4 py-2 text-sm">R {row.interest.toLocaleString("en-US")}</td>
                <td className="px-4 py-2 text-sm">R {row.balance.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
