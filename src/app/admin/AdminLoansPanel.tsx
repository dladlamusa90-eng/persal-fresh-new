"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
type LoanFilter = "ALL" | "PENDING" | "APPROVED" | "TRANSFERRED" | "REJECTED";
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
  totalAdmins: number;
};

export default function AdminLoansPanel({ initialLoans, totalAdmins }: Props) {
  const router = useRouter();
  const [loans, setLoans] = useState<AdminLoanRow[]>(initialLoans);
  const [loanFilter, setLoanFilter] = useState<LoanFilter>("ALL");
  const [showTransferredDetails, setShowTransferredDetails] = useState(false);
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

    const disbursedLoansOverall = loans.filter(
      (loan) => loan.status === "PAID" || Boolean(loan.disbursementSentAt)
    );

    const totalDisbursedOverall = disbursedLoansOverall.reduce(
      (sum, loan) => sum + loan.amount,
      0
    );

    return {
      totalProfit,
      loansCount: scopedPaidLoans.length,
      missingCustomRange: profitRange === "CUSTOM" && !hasCustomRange,
      totalDisbursedOverall,
      disbursedCountOverall: disbursedLoansOverall.length,
    };
  }, [customFromDate, customToDate, loans, profitRange]);

  const transferredSummary = useMemo(() => {
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

    const scopedTransferredLoans = loans.filter((loan) => {
      if (!loan.disbursementSentAt) return false;
      const transferredAt = new Date(loan.disbursementSentAt);

      if (profitRange === "CUSTOM") {
        if (!hasCustomRange || !customFrom || !customTo) return false;
        return transferredAt >= customFrom && transferredAt <= customTo;
      }

      return transferredAt >= fromDate && transferredAt <= now;
    });

    const totalAmountGiven = scopedTransferredLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const expectedProfit = scopedTransferredLoans.reduce(
      (sum, loan) => sum + calculateLoanProfit(loan.amount, loan.termDays),
      0
    );
    const realizedProfit = scopedTransferredLoans
      .filter((loan) => loan.status === "PAID")
      .reduce((sum, loan) => sum + calculateLoanProfit(loan.amount, loan.termDays), 0);

    const paidClientKeys = new Set(
      scopedTransferredLoans
        .filter((loan) => loan.status === "PAID")
        .map((loan) =>
          (loan.applicantEmail ?? loan.persalNumber ?? loan.applicantName).trim().toLowerCase()
        )
    );

    return {
      count: scopedTransferredLoans.length,
      totalAmountGiven,
      expectedProfit,
      realizedProfit,
      paidClientsCount: paidClientKeys.size,
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
        if (loan.disbursementSentAt) acc.transferred += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0, awaitingTransfer: 0, transferred: 0 }
    );
  }, [loans]);

  const filteredLoans = useMemo(() => {
    const base = loans.filter((loan) => {
      if (loanFilter === "ALL") return true;
      if (loanFilter === "TRANSFERRED") return Boolean(loan.disbursementSentAt);
      if (loanFilter === "APPROVED") return loan.status === "APPROVED" && !loan.disbursementSentAt;
      return loan.status === loanFilter;
    });
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

  function pipelineCardClass(active: boolean, tone: "amber" | "green" | "blue" | "red") {
    if (tone === "amber") {
      return active
        ? "border-amber-300 bg-amber-50 shadow-sm"
        : "border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/50";
    }

    if (tone === "green") {
      return active
        ? "border-green-300 bg-green-50 shadow-sm"
        : "border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/50";
    }

    if (tone === "blue") {
      return active
        ? "border-blue-300 bg-blue-50 shadow-sm"
        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50";
    }

    return active
      ? "border-red-300 bg-red-50 shadow-sm"
      : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50";
  }

  function getRangeLabel() {
    if (profitRange === "7D") return "Last 7 days";
    if (profitRange === "30D") return "Last 30 days";
    if (profitRange === "YEAR") return "Last 12 months";
    if (profitRange === "CUSTOM") {
      if (customFromDate && customToDate) {
        return `${customFromDate} to ${customToDate}`;
      }
      return "Custom range (incomplete)";
    }
    return "Current range";
  }

  return (
    <>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Quick Legend</p>
          <p className="text-xs text-slate-500">Admin accounts: <span className="font-semibold text-slate-700">{totalAdmins}</span></p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Pending Review
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Awaiting Disbursement
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Approved/Disbursed
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Rejected
          </span>
        </div>
      </div>

      <div className="mt-6 relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue" />
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19h16" />
                    <path d="M7 15l3-3 3 2 4-5" />
                  </svg>
                </span>
                Profit Summary
              </h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-slate-500">Overall Profit (selected range)</p>
              <p className="text-2xl font-bold text-green-700">R {currencyFormatter.format(Math.round(profitSummary.totalProfit))}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Loans Given (overall)</p>
              <p className="text-2xl font-bold text-persal-dark">R {currencyFormatter.format(Math.round(profitSummary.totalDisbursedOverall))}</p>
              <p className="mt-1 text-xs text-slate-600">
                Total Loans Disbursed: <span className="font-semibold">{transferredSummary.count}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTransferredDetails((prev) => !prev)}
            className="self-start text-sm text-slate-600 underline underline-offset-2 hover:text-persal-blue"
          >
            {showTransferredDetails ? "Collapse" : "Expand"}
          </button>

          {showTransferredDetails && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-slate-500">Date Range</span>
                <span className="font-semibold text-slate-900">{getRangeLabel()}</span>
              </div>

              {transferredSummary.missingCustomRange ? (
                <p className="text-amber-700">Select both custom dates in Profit Summary to view disbursed loan totals.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Number of Disbursed Loans</span>
                    <span className="font-semibold text-slate-900">{transferredSummary.count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Number of Clients Who Paid</span>
                    <span className="font-semibold text-slate-900">{transferredSummary.paidClientsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Amount Disbursed</span>
                    <span className="font-semibold text-slate-900">R {currencyFormatter.format(Math.round(transferredSummary.totalAmountGiven))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Profit Expected</span>
                    <span className="font-semibold text-blue-700">R {currencyFormatter.format(Math.round(transferredSummary.expectedProfit))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Profit Already Made</span>
                    <span className="font-semibold text-green-700">R {currencyFormatter.format(Math.round(transferredSummary.realizedProfit))}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {profitSummary.missingCustomRange && (
            <p className="text-xs text-amber-700">Select both dates to calculate custom profit.</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 md:p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
            Needs Attention
          </p>
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

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 md:p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h6" />
            </svg>
            Disbursement Queue
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{counts.awaitingTransfer}</p>
          <p className="text-sm text-blue-700">Approved applications still waiting for disbursement.</p>
          <button
            type="button"
            onClick={() => setLoanFilter("APPROVED")}
            className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            View Approved for Disbursement
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm overflow-hidden">
        <div className="-mx-4 md:-mx-5 -mt-4 md:-mt-5 mb-4 px-4 md:px-5 py-3 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-100/90">Loan Pipeline</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 items-stretch">
          <button
            type="button"
            onClick={() => setLoanFilter("PENDING")}
            className={`rounded-2xl border p-4 text-left transition ${pipelineCardClass(loanFilter === "PENDING", "amber")}`}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-amber-700">Step 1</p>
            <p className="mt-1 text-lg font-bold text-slate-900">Pending</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">{counts.pending}</p>
            <p className="mt-2 text-xs text-slate-500">Applications waiting for admin review.</p>
          </button>

          <div className="hidden xl:flex items-center justify-center text-slate-300">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => setLoanFilter("APPROVED")}
            className={`rounded-2xl border p-4 text-left transition ${pipelineCardClass(loanFilter === "APPROVED", "green")}`}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-green-700">Step 2</p>
            <p className="mt-1 text-lg font-bold text-slate-900">Approved</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{counts.awaitingTransfer}</p>
            <p className="mt-2 text-xs text-slate-500">Accepted and waiting for disbursement.</p>
          </button>

          <div className="hidden xl:flex items-center justify-center text-slate-300">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => setLoanFilter("TRANSFERRED")}
            className={`rounded-2xl border p-4 text-left transition ${pipelineCardClass(loanFilter === "TRANSFERRED", "blue")}`}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-blue-700">Step 3</p>
            <p className="mt-1 text-lg font-bold text-slate-900">Disbursed</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">{counts.transferred}</p>
            <p className="mt-2 text-xs text-slate-500">Funds disbursed and record captured.</p>
          </button>

          <div className="hidden xl:flex items-center justify-center text-slate-300">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => setLoanFilter("REJECTED")}
            className={`rounded-2xl border p-4 text-left transition ${pipelineCardClass(loanFilter === "REJECTED", "red")}`}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-red-700">Outcome</p>
            <p className="mt-1 text-lg font-bold text-slate-900">Rejected</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{counts.rejected}</p>
            <p className="mt-2 text-xs text-slate-500">Applications declined during review.</p>
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm overflow-hidden">
        <div className="-mx-4 md:-mx-5 -mt-4 md:-mt-5 mb-4 px-4 md:px-5 py-3 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-100/90 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
              <path d="M8 15h5" />
            </svg>
            Application Management
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h10" />
                </svg>
              </span>
              Applications
            </h3>
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
                        {loan.status === "APPROVED" && loan.disbursementSentAt ? "DISBURSED" : loan.status}
                      </span>
                      {loan.status === "APPROVED" && !loan.disbursementSentAt && (
                        <p className="text-xs text-amber-600 mt-2">Awaiting disbursement</p>
                      )}
                      {loan.status === "APPROVED" && loan.disbursementSentAt && (
                        <p className="text-xs text-green-600 mt-2">Disbursed</p>
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
                            Disburse Loan
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
