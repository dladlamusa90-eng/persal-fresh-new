"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateLoanCharges, getTermEndDate } from "@/lib/loanPolicy";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

type LatestLoan = {
  id: string;
  amount: number;
  termDays: number;
  status: LoanStatus;
  createdAt: string;
};

export default function PayNowPage() {
  const [loan, setLoan] = useState<LatestLoan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadLoan() {
      try {
        const response = await fetch("/api/loans/me", { cache: "no-store" });
        if (!response.ok) {
          if (mounted) setLoading(false);
          return;
        }

        const body = (await response.json()) as { latestLoan?: LatestLoan | null };
        const latestLoan = body.latestLoan ?? null;

        if (!mounted) return;

        if (!latestLoan || latestLoan.status === "REJECTED" || latestLoan.status === "PAID") {
          setLoan(null);
          setLoading(false);
          return;
        }

        setLoan(latestLoan);
        setLoading(false);
      } catch {
        if (mounted) {
          setLoan(null);
          setLoading(false);
        }
      }
    }

    loadLoan();
    return () => {
      mounted = false;
    };
  }, []);

  const paymentDetails = useMemo(() => {
    if (!loan) return null;

    const now = new Date();
    const firstMonthEnd = getTermEndDate(new Date(loan.createdAt), 30);
    const fullTermEnd = getTermEndDate(new Date(loan.createdAt), loan.termDays);

    const monthOneRepayable = calculateLoanCharges(loan.amount, 30).totalRepayable;
    const fullRepayable = calculateLoanCharges(loan.amount, loan.termDays).totalRepayable;

    const payableToday = now < firstMonthEnd ? monthOneRepayable : fullRepayable;

    return {
      payableToday,
      monthOneRepayable,
      fullRepayable,
      todayLabel: now.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      firstMonthEndLabel: firstMonthEnd.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      fullTermEndLabel: fullTermEnd.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  }, [loan]);

  async function handlePayNow() {
    if (!loan) return;

    setMessage("");
    setError("");
    setIsPaying(true);

    try {
      const response = await fetch(`/api/loans/${loan.id}/pay`, { method: "POST" });
      const body = (await response.json()) as {
        error?: string;
        pointsAwarded?: number;
        payment?: { amountPaid?: number; earlyPayment?: boolean };
      };

      if (!response.ok) {
        setError(body.error ?? "Payment failed.");
        return;
      }

      const amountPaid = Number(body.payment?.amountPaid ?? 0).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
      const earlyTag = body.payment?.earlyPayment ? " (month-1 profit applied)" : "";
      const pointsAwarded = body.pointsAwarded ?? 0;

      setMessage(`Payment recorded: R ${amountPaid}${earlyTag}. Points awarded: ${pointsAwarded}.`);
      setLoan(null);
    } catch {
      setError("Network error while recording payment.");
    } finally {
      setIsPaying(false);
    }
  }

  if (loading) {
    return (
      <section className="max-w-2xl mx-auto py-10 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Loading payment details...</div>
      </section>
    );
  }

  if (!loan) {
    return (
      <section className="max-w-2xl mx-auto py-10 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">Pay Now</h1>
          <p className="mt-2 text-slate-600">You do not have an active payable loan.</p>
          {message && <p className="mt-3 text-green-700">{message}</p>}
          {error && <p className="mt-3 text-red-600">{error}</p>}
        </div>
      </section>
    );
  }

  if (loan.status !== "APPROVED") {
    return (
      <section className="max-w-2xl mx-auto py-10 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">Pay Now</h1>
          <p className="mt-2 text-slate-600">
            Your latest loan is currently <span className="font-semibold">{loan.status}</span>. Payment is available once the loan is approved.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto py-10 px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Pay Now</h1>
        <p className="mt-2 text-sm text-slate-600">Pay the full amount due today with profit applicable for today&apos;s date.</p>
        <p className="mt-1 text-xs text-amber-700">Mock payment mode: this simulates payment so you can verify status updates and points behavior.</p>

        {paymentDetails && (
          <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Amount due today ({paymentDetails.todayLabel})</span>
              <span className="text-lg font-bold text-slate-900">R {paymentDetails.payableToday.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">If paid before {paymentDetails.firstMonthEndLabel}</span>
              <span className="font-semibold text-slate-700">R {paymentDetails.monthOneRepayable.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">If paid after month one (until {paymentDetails.fullTermEndLabel})</span>
              <span className="font-semibold text-slate-700">R {paymentDetails.fullRepayable.toLocaleString()}</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handlePayNow}
          disabled={isPaying}
          className="mt-5 w-full rounded-xl bg-persal-blue px-4 py-3 font-semibold text-white hover:bg-persal-dark transition disabled:opacity-60"
        >
          {isPaying ? "Processing Mock Payment..." : "Pay Full Amount Now (Mock)"}
        </button>

        {message && <p className="mt-3 text-green-700">{message}</p>}
        {error && <p className="mt-3 text-red-600">{error}</p>}
      </div>
    </section>
  );
}
