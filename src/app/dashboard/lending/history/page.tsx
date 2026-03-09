import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  PAID: "bg-gray-100 text-gray-700",
};

export default async function HistoryPage() {
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
    <section className="max-w-2xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Loan History</h2>
      {loans.length === 0 ? (
        <p className="text-gray-500">No loan history found.</p>
      ) : (
        <ul className="space-y-4">
          {loans.map((loan) => (
            <li key={loan.id} className="bg-white rounded-xl shadow p-6 border border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-gray-900">R {loan.amount.toLocaleString("en-US")}</div>
                <div className="text-xs text-gray-500">{loan.createdAt.toISOString().slice(0, 10)}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor[loan.status] ?? "bg-gray-100 text-gray-700"}`}>
                {loan.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
