import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

function progressFromStatus(status: "PENDING" | "APPROVED" | "REJECTED" | "PAID") {
  if (status === "PAID") return "100%";
  if (status === "APPROVED") return "50%";
  return "0%";
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
      status: true,
      createdAt: true,
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
                <td className="py-2 px-4 font-medium">{loan.id}</td>
                <td className="py-2 px-4">R {loan.amount.toLocaleString()}</td>
                <td className="py-2 px-4">{loan.status}</td>
                <td className="py-2 px-4">{progressFromStatus(loan.status)}</td>
                <td className="py-2 px-4">
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
