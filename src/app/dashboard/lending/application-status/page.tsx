import { redirect } from "next/navigation";
import Link from "next/link";
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
    dot: "bg-teal-500",
    text: "text-teal-700",
    label: "Paid",
    subtitle: "This loan has been fully settled.",
  },
} as const;

const START_APPLICATION_HREF = "/dashboard/lending/verify-number?loan=1500&term=1&termDays=30";

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
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl md:text-3xl font-normal text-persal-dark">Loan Status</h2>
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 md:p-6">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-500" />
              <span className="font-semibold text-gray-800">No active application</span>
            </div>
            <p className="mt-2 text-gray-600">You have not submitted a loan application yet.</p>
            <Link
              href={START_APPLICATION_HREF}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
            >
              Start Application
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const statusView = statusConfig[loan.status];
  const appliedOn = loan.createdAt.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const termMonths = getTermMonths(loan.termDays);
  const progressStep = loan.status === "PENDING" ? 2 : 3;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-normal text-persal-dark">Loan Status</h2>
            <p className="mt-2 text-sm text-gray-600">Track the latest state of your most recent application.</p>
          </div>
          <Link
            href="/dashboard/lending/history"
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            View History
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 md:p-6">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${statusView.dot}`}></span>
            <span className={`${statusView.text} font-semibold`}>{statusView.label}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{statusView.subtitle}</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`rounded-lg border px-3 py-2 ${progressStep >= 1 ? "border-teal-200 bg-teal-50" : "border-gray-200 bg-white"}`}>
              <p className="text-xs font-semibold text-gray-700">1. Submitted</p>
              <p className="text-xs text-gray-600 mt-1">Application received.</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${progressStep >= 2 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
              <p className="text-xs font-semibold text-gray-700">2. Under Review</p>
              <p className="text-xs text-gray-600 mt-1">Admin verification in progress.</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${progressStep >= 3 ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
              <p className="text-xs font-semibold text-gray-700">3. Decision</p>
              <p className="text-xs text-gray-600 mt-1">Final status is available.</p>
            </div>
          </div>

          {loan.status === "REJECTED" && loan.rejectionReason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-700 font-semibold">Rejection Reason</p>
              <p className="text-sm text-red-700 mt-1">{loan.rejectionReason}</p>
            </div>
          )}

          {(loan.status === "REJECTED" || loan.status === "PAID") && (
            <Link
              href={START_APPLICATION_HREF}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
            >
              Start New Application
            </Link>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Applied On</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{appliedOn}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Requested Amount</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">R {loan.amount.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Term</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{termMonths} month{termMonths > 1 ? "s" : ""} ({loan.termDays} days)</p>
          </div>
        </div>
      </div>
    </section>
  );
}
