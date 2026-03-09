import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import { getTermMonths } from "@/lib/loanPolicy";

const statusConfig = {
  PENDING: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    label: "Pending",
    subtitle: "Your application is awaiting admin review.",
  },
  APPROVED: {
    dot: "bg-green-500",
    text: "text-green-700",
    label: "Approved",
    subtitle: "Your loan has been approved by admin and sent automatically.",
  },
  REJECTED: {
    dot: "bg-red-500",
    text: "text-red-700",
    label: "Rejected",
    subtitle: "Your application was rejected by admin.",
  },
  PAID: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    label: "Paid",
    subtitle: "This loan has been fully settled.",
  },
} as const;

export default async function ApplicationStatusPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/auth/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
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
      status: true,
      rejectionReason: true,
      amount: true,
      termDays: true,
      createdAt: true,
    },
  });

  if (!loan) {
    return (
      <section className="max-w-xl mx-auto py-12">
        <h2 className="text-2xl font-semibold mb-6">Application Status</h2>
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <p className="text-gray-700">You have not submitted a loan application yet.</p>
        </div>
      </section>
    );
  }

  const statusView = statusConfig[loan.status];

  return (
    <section className="max-w-xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Application Status</h2>
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${statusView.dot}`}></span>
          <span className={`${statusView.text} font-semibold`}>{statusView.label}</span>
        </div>
        <p className="text-sm text-gray-600">{statusView.subtitle}</p>
        {loan.status === "REJECTED" && loan.rejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs text-red-700 font-semibold">Rejection Reason</p>
            <p className="text-sm text-red-700 mt-1">{loan.rejectionReason}</p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Applied On</span>
          <span className="text-lg font-bold text-gray-900">{loan.createdAt.toISOString().slice(0, 10)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Requested Amount</span>
          <span className="text-lg font-bold text-gray-900">R {loan.amount.toLocaleString()}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Term</span>
          <span className="text-lg font-bold text-gray-900">{getTermMonths(loan.termDays)} month{getTermMonths(loan.termDays) > 1 ? "s" : ""} ({loan.termDays} days)</span>
        </div>
      </div>
    </section>
  );
}
