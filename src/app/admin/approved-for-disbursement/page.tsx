import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";

export default async function ApprovedForDisbursementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const approvedLoans = await prisma.loan.findMany({
    where: {
      status: "APPROVED",
      disbursementSentAt: null,
    },
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

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 py-4 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-100/90">Disbursement Queue</p>
            <h1 className="mt-1 text-xl md:text-2xl font-bold text-white">Approved Loans Awaiting Disbursement</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-100/85">
              Total approved loans awaiting disbursement: <span className="font-semibold">{approvedLoans.length}</span>
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="px-4 py-3 font-semibold">Applicant</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Persal Number</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Term</th>
                <th className="px-4 py-3 font-semibold">Approved Queue Date</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {approvedLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No approved loans are currently waiting for disbursement.
                  </td>
                </tr>
              ) : (
                approvedLoans.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{loan.user.fullName}</td>
                    <td className="px-4 py-3 text-slate-700">{loan.applicantEmail ?? loan.user.email ?? "No email"}</td>
                    <td className="px-4 py-3 text-slate-700">{loan.user.persalNumber ?? "N/A"}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">R {new Intl.NumberFormat("en-US").format(Math.round(loan.amount))}</td>
                    <td className="px-4 py-3 text-slate-700">{loan.termDays} days</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(loan.createdAt).toLocaleDateString("en-ZA", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/loans/${loan.id}/transfer`}
                        className="inline-flex items-center rounded-lg bg-persal-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-persal-dark"
                      >
                        Disburse Loan
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
