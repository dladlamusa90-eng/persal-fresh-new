import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { calculateLoanCharges, getTermEndDate } from "@/lib/loanPolicy";

export default async function StatementPage() {
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
      createdAt: true,
    },
  });

  const transactions = loan
    ? [
        {
          date: loan.createdAt.toISOString().slice(0, 10),
          type: "Disbursement",
          amount: loan.amount,
        },
        {
          date: getTermEndDate(loan.createdAt, loan.termDays).toISOString().slice(0, 10),
          type: "Repayment",
          amount: -calculateLoanCharges(loan.amount, loan.termDays).totalRepayable,
        },
      ]
    : [];

  return (
    <section className="max-w-3xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Loan Statement</h2>
      {transactions.length === 0 ? (
        <p className="text-gray-500">No statement available yet.</p>
      ) : (
      <>
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full bg-white rounded-xl shadow border border-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Type</th>
              <th className="px-4 py-2 text-left text-xs text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-2 text-sm">{tx.date}</td>
                <td className="px-4 py-2 text-sm">{tx.type}</td>
                <td className={`px-4 py-2 text-sm ${tx.amount < 0 ? "text-red-600" : "text-green-700"}`}>R {Math.abs(tx.amount).toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4">
        <button className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition">Download PDF</button>
        <button className="px-6 py-3 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition">Download CSV</button>
      </div>
      </>
      )}
    </section>
  );
}
