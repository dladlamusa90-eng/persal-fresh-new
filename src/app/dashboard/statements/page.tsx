import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import StatementDownloadButton from "./StatementDownloadButton";
import { calculateLoanCharges, getTermEndDate } from "@/lib/loanPolicy";

export default async function StatementsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id && !session?.user?.email) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: session.user.id
      ? { id: session.user.id }
      : { email: String(session.user.email ?? "") },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      idNumber: true,
      persalNumber: true,
      bankName: true,
      accountNumber: true,
      createdAt: true,
      points: true,
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  const loans = await prisma.loan.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      termDays: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
    },
  });

  const paidLoans = loans.filter((loan) => loan.status === "PAID");

  const paymentHistory = paidLoans.map((loan) => ({
    date: getTermEndDate(loan.createdAt, loan.termDays).toISOString().slice(0, 10),
    amount: `R ${calculateLoanCharges(loan.amount, loan.termDays).totalRepayable.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`,
  }));

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow p-6 border border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-persal-blue mb-2">Statements</h2>
          <div className="text-persal-dark">Download your latest statement or view payment history below.</div>
        </div>
        <StatementDownloadButton
          statementData={{
            user: {
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              idNumber: user.idNumber,
              persalNumber: user.persalNumber,
              bankName: user.bankName,
              accountNumber: user.accountNumber,
              points: user.points,
              joinedAt: user.createdAt.toISOString(),
            },
            loans: loans.map((loan) => ({
              id: loan.id,
              amount: loan.amount,
              termDays: loan.termDays,
              status: loan.status,
              rejectionReason: loan.rejectionReason,
              createdAt: loan.createdAt.toISOString(),
            })),
            paymentHistory,
          }}
        />
      </div>
      <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-persal-blue mb-4">Payment History</h3>
        {paymentHistory.length === 0 ? (
          <p className="text-gray-500">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {paymentHistory.map((payment, index) => (
              <li key={`${payment.date}-${index}`} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-persal-dark">{payment.date}</span>
                <span className="font-medium">{payment.amount}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
