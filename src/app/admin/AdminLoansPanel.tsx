"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LOAN_REJECTION_REASONS } from "@/lib/loanRejectionReasons";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
type LoanAction = "approve" | "reject";
type LoanFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type ProfitRange = "7D" | "30D" | "YEAR" | "CUSTOM";

type AdminLoanRow = {
  id: string;
  applicantName: string;
  persalNumber: string | null;
  amount: number;
  termDays: number;
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
  const [profitRange, setProfitRange] = useState<ProfitRange>("30D");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [loadingById, setLoadingById] = useState<Record<string, LoanAction | null>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [rejectionReasonById, setRejectionReasonById] = useState<Record<string, string>>({});
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
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [loans]);

  const filteredLoans = useMemo(() => {
    if (loanFilter === "ALL") return loans;
    return loans.filter((loan) => loan.status === loanFilter);
  }, [loanFilter, loans]);

  async function handleAction(loanId: string, action: LoanAction) {
    const targetStatus: LoanStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const currentLoan = loans.find((loan) => loan.id === loanId);
    if (!currentLoan) return;

    if (currentLoan.status !== "PENDING") return;

    const selectedReason = rejectionReasonById[loanId] ?? "";
    if (action === "reject" && !selectedReason) {
      setErrorById((prev) => ({ ...prev, [loanId]: "Please select a rejection reason." }));
      return;
    }

    const previousStatus = currentLoan.status;
    const previousReason = currentLoan.rejectionReason;

    setLoadingById((prev) => ({ ...prev, [loanId]: action }));
    setErrorById((prev) => ({ ...prev, [loanId]: "" }));
    setLoans((prev) =>
      prev.map((loan) =>
        loan.id === loanId
          ? {
              ...loan,
              status: targetStatus,
              rejectionReason: action === "reject" ? selectedReason : null,
            }
          : loan
      )
    );

    try {
      const response = await fetch(`/api/admin/loans/${loanId}/${action}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: action === "reject" ? JSON.stringify({ reason: selectedReason }) : undefined,
      });

      if (!response.ok) {
        let message = "Failed to update loan status.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          message = "Failed to update loan status.";
        }

        setLoans((prev) =>
          prev.map((loan) =>
            loan.id === loanId
              ? { ...loan, status: previousStatus, rejectionReason: previousReason }
              : loan
          )
        );
        setErrorById((prev) => ({ ...prev, [loanId]: message }));
      } else {
        const body = (await response.json()) as {
          loan?: { status?: LoanStatus; rejectionReason?: string | null };
        };

        if (body.loan) {
          setLoans((prev) =>
            prev.map((loan) =>
              loan.id === loanId
                ? {
                    ...loan,
                    status: body.loan?.status ?? targetStatus,
                    rejectionReason:
                      body.loan?.rejectionReason ??
                      (action === "reject" ? selectedReason : null),
                  }
                : loan
            )
          );
        }
      }
    } catch {
      setLoans((prev) =>
        prev.map((loan) =>
          loan.id === loanId
            ? { ...loan, status: previousStatus, rejectionReason: previousReason }
            : loan
        )
      );
      setErrorById((prev) => ({ ...prev, [loanId]: "Network error. Please try again." }));
    } finally {
      setLoadingById((prev) => ({ ...prev, [loanId]: null }));
    }
  }

  return (
    <>
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900">Profit Summary</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setProfitRange("7D")}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium ${profitRange === "7D" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => setProfitRange("30D")}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium ${profitRange === "30D" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                30 days
              </button>
              <button
                type="button"
                onClick={() => setProfitRange("YEAR")}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium ${profitRange === "YEAR" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Yearly
              </button>
              <button
                type="button"
                onClick={() => setProfitRange("CUSTOM")}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium ${profitRange === "CUSTOM" ? "bg-teal-50 border-teal-300 text-teal-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
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
              <p className="text-sm text-gray-500">Overall Profit (selected range)</p>
              <p className="text-2xl font-bold text-green-700">R {currencyFormatter.format(Math.round(profitSummary.totalProfit))}</p>
            </div>
            <p className="text-sm text-gray-600">Paid Loans Count: <span className="font-semibold">{profitSummary.loansCount}</span></p>
          </div>

          {profitSummary.missingCustomRange && (
            <p className="text-xs text-amber-700">Select both dates to calculate custom profit.</p>
          )}
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

      <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="px-4 py-3 font-semibold">Applicant Name</th>
              <th className="px-4 py-3 font-semibold">Persal Number</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Term</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No loans found.
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => {
                const rowLoading = loadingById[loan.id];
                const disabled = rowLoading === "approve" || rowLoading === "reject";
                const isPending = loan.status === "PENDING";

                return (
                  <tr key={loan.id} className="border-b border-gray-100 last:border-0 align-top">
                    <td className="px-4 py-3 text-gray-900 font-medium">{loan.applicantName}</td>
                    <td className="px-4 py-3 text-gray-700">{loan.persalNumber ?? "N/A"}</td>
                    <td className="px-4 py-3 text-gray-700">R {currencyFormatter.format(loan.amount)}</td>
                    <td className="px-4 py-3 text-gray-700">{loan.termDays} days</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {loan.status}
                      </span>
                      {loan.status === "REJECTED" && loan.rejectionReason && (
                        <p className="text-xs text-red-600 mt-2">Reason: {loan.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <div className="flex flex-col gap-2">
                          <select
                            value={rejectionReasonById[loan.id] ?? ""}
                            onChange={(event) =>
                              setRejectionReasonById((prev) => ({
                                ...prev,
                                [loan.id]: event.target.value,
                              }))
                            }
                            className="px-2 py-1.5 rounded-md border border-gray-300 text-xs text-gray-700"
                            disabled={disabled}
                          >
                            <option value="">Select rejection reason</option>
                            {LOAN_REJECTION_REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(loan.id, "approve")}
                              disabled={disabled}
                              className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {rowLoading === "approve" ? "Approving..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleAction(loan.id, "reject")}
                              disabled={disabled}
                              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {rowLoading === "reject" ? "Rejecting..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">Processed</span>
                      )}
                      {errorById[loan.id] && (
                        <p className="text-xs text-red-600 mt-2">{errorById[loan.id]}</p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
