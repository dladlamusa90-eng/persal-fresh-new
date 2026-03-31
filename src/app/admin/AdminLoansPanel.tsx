"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
type LoanFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type ProfitRange = "7D" | "30D" | "YEAR" | "CUSTOM";

type AdminLoanRow = {
  id: string;
  applicantName: string;
  applicantEmail: string | null;
  persalNumber: string | null;
  amount: number;
  termDays: number;
  grossSalary: number | null;
  disposableIncome: number | null;
  disbursementSentAt: string | null;
  status: LoanStatus;
  rejectionReason: string | null;
  createdAt: string;
};

type Props = {
  initialLoans: AdminLoanRow[];
  totalUsers: number;
  totalAdmins: number;
};

export default function AdminLoansPanel({ initialLoans, totalUsers, totalAdmins }: Props) {
  const router = useRouter();
  const [loans, setLoans] = useState<AdminLoanRow[]>(initialLoans);
  const [loanFilter, setLoanFilter] = useState<LoanFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [profitRange, setProfitRange] = useState<ProfitRange>("30D");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const currencyFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  function calculateLoanProfit(amount: number, termDays: number) {
    const interest1 = amount * 0.05;
    const interest2 = termDays >= 60 ? amount * 0.03 : 0;
    const interest3 = termDays >= 90 ? amount * 0.02 : 0;
    const initiationFee = amount <= 1000 ? 150 : amount <= 1500 ? 200 : 300;
    const serviceFee = 60;
    return interest1 + interest2 + interest3 + initiationFee + serviceFee;
  }

  const profitSummary = useMemo(() => {
    const now = new Date();
    const fromDate = new Date(now);
    let hasCustomRange = false;

    if (profitRange === "7D") {
      fromDate.setDate(now.getDate() - 7);
    } else if (profitRange === "30D") {
      fromDate.setDate(now.getDate() - 30);
    } else if (profitRange === "YEAR") {
      fromDate.setFullYear(now.getFullYear() - 1);
    } else {
      hasCustomRange = Boolean(customFromDate && customToDate);
    }

    const customFrom = customFromDate ? new Date(`${customFromDate}T00:00:00`) : null;
    const customTo = customToDate ? new Date(`${customToDate}T23:59:59`) : null;

    const scopedPaidLoans = loans.filter((loan) => {
      if (loan.status !== "PAID") return false;
      const createdAt = new Date(loan.createdAt);

      if (profitRange === "CUSTOM") {
        if (!hasCustomRange || !customFrom || !customTo) return false;
        return createdAt >= customFrom && createdAt <= customTo;
      }

      return createdAt >= fromDate && createdAt <= now;
    });

    const totalProfit = scopedPaidLoans.reduce(
      (sum, loan) => sum + calculateLoanProfit(loan.amount, loan.termDays),
      0
    );

    return {
      totalProfit,
      loansCount: scopedPaidLoans.length,
      missingCustomRange: profitRange === "CUSTOM" && !hasCustomRange,
    };
  }, [customFromDate, customToDate, loans, profitRange]);

  const counts = useMemo(() => {
    return loans.reduce(
      (acc, loan) => {
        acc.total += 1;
        if (loan.status === "PENDING") acc.pending += 1;
        if (loan.status === "APPROVED") acc.approved += 1;
        if (loan.status === "REJECTED") acc.rejected += 1;
        if (loan.status === "APPROVED" && !loan.disbursementSentAt) acc.awaitingTransfer += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0, awaitingTransfer: 0 }
    );
  }, [loans]);

  const filteredLoans = useMemo(() => {
    const base = loanFilter === "ALL" ? loans : loans.filter((loan) => loan.status === loanFilter);
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return base;

    return base.filter((loan) => {
      return [
        loan.applicantName,
        loan.applicantEmail ?? "",
        loan.persalNumber ?? "",
        String(loan.amount),
        loan.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [loanFilter, loans, searchTerm]);

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function statusPill(status: LoanStatus) {
    if (status === "PENDING") return "bg-amber-50 text-amber-700 border border-amber-200";
    if (status === "APPROVED") return "bg-green-50 text-green-700 border border-green-200";
    if (status === "REJECTED") return "bg-red-50 text-red-700 border border-red-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  return (
    <>
      <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Profit Summary</h2>
              <p className="text-xs text-slate-500 mt-1">Quick business performance across paid loans.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setProfitRange("7D")}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${profitRange === "7D" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => setProfitRange("30D")}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${profitRange === "30D" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                30 days
              </button>
              <button
                type="button"
                onClick={() => setProfitRange("YEAR")}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${profitRange === "YEAR" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                Yearly
              </button>
              <button
                type="button"
                onClick={() => setProfitRange("CUSTOM")}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${profitRange === "CUSTOM" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                Custom
              </button>
            </div>
          </div>

          {profitRange === "CUSTOM" && (
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <span>From</span>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5"
                />
              </label>
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <span>To</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5"
                />
              </label>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm text-slate-500">Overall Profit (selected range)</p>
              <p className="text-2xl font-bold text-green-700">R {currencyFormatter.format(Math.round(profitSummary.totalProfit))}</p>
            </div>
            <p className="text-sm text-slate-600">Paid Loans Count: <span className="font-semibold">{profitSummary.loansCount}</span></p>
          </div>

          {profitSummary.missingCustomRange && (
            <p className="text-xs text-amber-700">Select both dates to calculate custom profit.</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Needs Attention</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{counts.pending}</p>
          <p className="text-sm text-amber-700">Pending applications waiting for review decision.</p>
          <button
            type="button"
            onClick={() => setLoanFilter("PENDING")}
            className="mt-3 inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Open Pending Queue
          </button>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Transfer Queue</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{counts.awaitingTransfer}</p>
          <p className="text-sm text-blue-700">Approved applications still waiting for transfer.</p>
          <button
            type="button"
            onClick={() => setLoanFilter("APPROVED")}
            className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            View Approved Applications
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <button
          type="button"
          onClick={() => router.push("/admin/users?role=USER")}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-left hover:border-teal-300 hover:bg-teal-50 transition"
        >
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{totalUsers}</p>
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/users?role=ADMIN")}
          className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-left hover:border-indigo-300 hover:bg-indigo-50 transition"
        >
          <p className="text-sm text-gray-500">Total Admins</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{totalAdmins}</p>
        </button>
        <button
          type="button"
          onClick={() => setLoanFilter("ALL")}
          className={`border rounded-xl p-5 shadow-sm text-left transition ${
            loanFilter === "ALL"
              ? "bg-gray-100 border-gray-400"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <p className="text-sm text-gray-500">Total Loans</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{counts.total}</p>
        </button>
        <button
          type="button"
          onClick={() => setLoanFilter("PENDING")}
          className={`border rounded-xl p-5 shadow-sm text-left transition ${
            loanFilter === "PENDING"
              ? "bg-amber-50 border-amber-300"
              : "bg-white border-gray-200 hover:border-amber-200"
          }`}
        >
          <p className="text-sm text-gray-500">Pending Loans</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.pending}</p>
        </button>
        <button
          type="button"
          onClick={() => setLoanFilter("APPROVED")}
          className={`border rounded-xl p-5 shadow-sm text-left transition ${
            loanFilter === "APPROVED"
              ? "bg-green-50 border-green-300"
              : "bg-white border-gray-200 hover:border-green-200"
          }`}
        >
          <p className="text-sm text-gray-500">Approved Loans</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{counts.approved}</p>
        </button>
        <button
          type="button"
          onClick={() => setLoanFilter("REJECTED")}
          className={`border rounded-xl p-5 shadow-sm text-left transition ${
            loanFilter === "REJECTED"
              ? "bg-red-50 border-red-300"
              : "bg-white border-gray-200 hover:border-red-200"
          }`}
        >
          <p className="text-sm text-gray-500">Rejected Loans</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{counts.rejected}</p>
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Applications</h3>
            <p className="text-xs text-slate-500 mt-1">Search by applicant, email, persal number, status, or amount.</p>
          </div>
          <div className="w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search applications..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="px-4 py-3 font-semibold">Applicant</th>
              <th className="px-4 py-3 font-semibold">Persal Number</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Term</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  No loans found.
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => {
                const isPending = loan.status === "PENDING";

                return (
                  <tr key={loan.id} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      <div>{loan.applicantName}</div>
                      <div className="text-xs text-slate-500 mt-1">{loan.applicantEmail ?? "No email"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{loan.persalNumber ?? "N/A"}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">R {currencyFormatter.format(loan.amount)}</td>
                    <td className="px-4 py-3 text-slate-700">{loan.termDays} days</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(loan.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(loan.status)}`}>
                        {loan.status}
                      </span>
                      {loan.status === "APPROVED" && !loan.disbursementSentAt && (
                        <p className="text-xs text-amber-600 mt-2">Awaiting transfer</p>
                      )}
                      {loan.status === "APPROVED" && loan.disbursementSentAt && (
                        <p className="text-xs text-green-600 mt-2">Transferred</p>
                      )}
                      {loan.status === "REJECTED" && loan.rejectionReason && (
                        <p className="text-xs text-red-600 mt-2">Reason: {loan.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View Application (Decide)
                          </Link>
                          <p className="text-xs text-slate-500">Open application details to approve or reject.</p>
                        </div>
                      ) : loan.status === "APPROVED" && !loan.disbursementSentAt ? (
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View Application
                          </Link>
                          <Link
                            href={`/admin/loans/${loan.id}/transfer`}
                            className="px-3 py-1.5 rounded-lg bg-persal-blue text-center text-xs font-semibold text-white hover:bg-persal-dark"
                          >
                            Transfer Loan
                          </Link>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View Application
                          </Link>
                          <span className="text-xs text-slate-500 font-medium">Processed</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
