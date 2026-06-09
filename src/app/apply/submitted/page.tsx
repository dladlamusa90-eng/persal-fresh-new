"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { calculateLoanCharges, getTermMonths, calculatePointsForRepayment } from "@/lib/loanPolicy";

type LoanSummary = {
  amount: number;
  termDays: number;
  bankName: string;
  accountNumber: string;
  accountType: string;
  fullName: string;
};

function fmt(n: number) {
  return n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function debitDates(termDays: number): Date[] {
  const termMonths = getTermMonths(termDays);
  const today = new Date();
  return Array.from({ length: termMonths }, (_, i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + i + 1);
    return d;
  });
}

function accountTypeLabel(t: string) {
  if (t === "CHEQUE") return "Cheque / Current";
  if (t === "SAVINGS") return "Savings";
  if (t === "TRANSMISSION") return "Transmission";
  return t || "—";
}

function SubmittedContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const isNewUser = searchParams.get("newUser") === "1";
  const [summary, setSummary] = useState<LoanSummary | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("loanSubmittedSummary");
      if (raw) setSummary(JSON.parse(raw));
    } catch {}
  }, []);

  const charges = summary ? calculateLoanCharges(summary.amount, summary.termDays) : null;
  const termMonths = summary ? getTermMonths(summary.termDays) : 1;
  const points = summary ? calculatePointsForRepayment(summary.amount) : 0;
  const dates = summary ? debitDates(summary.termDays) : [];
  const maskedAccount = summary?.accountNumber
    ? `•••• ${summary.accountNumber.slice(-4)}`
    : "—";

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Persal" className="h-12 object-contain" />
          </a>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full space-y-5">

        {/* ── Success banner ───────────────────────────────────────── */}
        <div className="bg-[#0d2240] rounded-2xl px-6 py-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-teal-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-9 h-9 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
          <p className="text-teal-200 text-sm mb-4">We have received your loan application.</p>
          {ref && (
            <div className="inline-block bg-white/10 rounded-xl px-5 py-2">
              <p className="text-teal-300 text-xs mb-0.5">Application Reference</p>
              <p className="font-mono text-white font-bold tracking-widest text-sm">{ref}</p>
            </div>
          )}
        </div>

        {/* ── Repayment Schedule card ──────────────────────────────── */}
        {charges && summary && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="print-statement">

            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <p className="text-xs font-bold text-persal-dark uppercase tracking-wider">Debit Order Schedule</p>
                <p className="text-xs text-gray-400 mt-0.5">Keep this for your records</p>
              </div>
              <button
                onClick={handlePrint}
                className="print:hidden flex items-center gap-1.5 text-sm font-semibold text-persal-blue border border-persal-blue/30 rounded-lg px-3 py-1.5 hover:bg-persal-blue/5 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
            </div>

            {/* Loan overview */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-black text-persal-dark">R{fmt(summary.amount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Loan Amount</p>
                </div>
                <div>
                  <p className="text-xl font-black text-persal-dark">{termMonths}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Month{termMonths > 1 ? "s" : ""}</p>
                </div>
                <div>
                  <p className="text-xl font-black text-orange-500">R{fmt(charges.monthlyRepayment)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">/ Month</p>
                </div>
              </div>
            </div>

            {/* Monthly debit dates table */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Monthly Debit Dates</p>
              <div className="space-y-2">
                {dates.map((date, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-persal-blue/10 flex items-center justify-center text-persal-blue font-bold text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {date.toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                        <p className="text-xs text-gray-400">Debit from {summary.bankName} {maskedAccount}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-persal-dark">R{fmt(charges.monthlyRepayment)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Charges Breakdown</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Month 1 Interest (5%)</span>
                  <span>R{fmt(charges.interestMonth1)}</span>
                </div>
                {charges.interestMonth2 > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Month 2 Interest (3%)</span>
                    <span>R{fmt(charges.interestMonth2)}</span>
                  </div>
                )}
                {charges.interestMonth3 > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Month 3 Interest (2%)</span>
                    <span>R{fmt(charges.interestMonth3)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Initiation Fee</span>
                  <span>R{fmt(charges.initiationFee)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Service Fee</span>
                  <span>R{fmt(charges.serviceFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-2 mt-1">
                  <span>Total Interest & Fees</span>
                  <span>R{fmt(charges.totalCost)}</span>
                </div>
                <div className="flex justify-between font-black text-persal-dark text-base">
                  <span>Total Repayable</span>
                  <span>R{fmt(charges.totalRepayable)}</span>
                </div>
              </div>
            </div>

            {/* Bank debit info */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Debit Account</p>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <svg className="w-8 h-8 text-persal-blue/60 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{summary.bankName} — {accountTypeLabel(summary.accountType)}</p>
                  <p className="text-xs text-gray-400">{maskedAccount}</p>
                </div>
              </div>
            </div>

            {/* Points reward */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Loyalty Points</p>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-2xl mt-0.5">⭐</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    Earn {points} points on this loan!
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Pay every instalment on time and receive <strong>{points} loyalty points</strong> added to your account. Points unlock benefits and higher loan limits.
                  </p>
                </div>
              </div>
            </div>

            {/* Important note */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>
                  Debit orders will be processed on the dates shown above. Ensure sufficient funds are available to avoid penalties. Your application is still subject to approval — we will notify you within 1–2 business days.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ── Next steps ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-5 space-y-4 print:hidden">
          <h2 className="text-sm font-bold text-persal-dark uppercase tracking-wider">Next Steps</h2>

          <div className="text-sm text-gray-600 space-y-2">
            <p>Our team will review your application and contact you within <strong>1–2 business days</strong>.</p>
            <p>If approved, funds will be transferred to your bank account promptly.</p>
          </div>

          {isNewUser && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4">
              <p className="text-orange-800 font-semibold text-sm mb-1">Account created for you</p>
              <p className="text-orange-700 text-sm">
                We have created a Persal account using your email. You can{" "}
                <Link href="/auth/login" className="underline font-medium">log in</Link>{" "}
                to track your application, earn points, and access more features.
              </p>
            </div>
          )}

          <Link
            href="/auth/login"
            className="block w-full text-center bg-persal-blue hover:bg-persal-dark text-white font-semibold text-sm px-4 py-3 rounded-xl transition"
          >
            Log In to Track Your Application
          </Link>
          <Link
            href="/"
            className="block w-full text-center border border-gray-300 text-gray-700 font-medium text-sm px-4 py-3 rounded-xl hover:bg-gray-50 transition"
          >
            Back to Home
          </Link>
        </div>

      </main>
    </div>
  );
}

export default function ApplicationSubmittedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <SubmittedContent />
    </Suspense>
  );
}


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Persal" className="h-12 object-contain" />
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Success card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-persal-dark px-6 py-8 text-center">
              <div className="w-16 h-16 bg-teal-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
              <p className="text-teal-200 text-sm">We have received your loan application.</p>
            </div>

            <div className="px-6 py-6 space-y-4">
              {ref && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Application Reference</p>
                  <p className="font-mono text-sm font-semibold text-persal-dark">{ref}</p>
                </div>
              )}

              <div className="text-sm text-gray-600 space-y-2">
                <p>Our team will review your application and contact you within <strong>1–2 business days</strong>.</p>
                <p>If approved, funds will be transferred to your bank account promptly.</p>
              </div>

              {isNewUser && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4">
                  <p className="text-orange-800 font-semibold text-sm mb-1">Account created for you</p>
                  <p className="text-orange-700 text-sm">
                    We have created a Persal account using your email. You can{" "}
                    <Link href="/auth/login" className="underline font-medium">LogIn</Link>{" "}
                    to track your application, earn points, and access more features.
                  </p>
                </div>
              )}

              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-4">
                <p className="text-teal-800 font-semibold text-sm mb-2">Track Your Application</p>
                <p className="text-teal-700 text-sm mb-3">
                  Log in to check your application status, earn points on timely repayments, and access more features.
                </p>
                <Link
                  href="/auth/login"
                  className="mt-1 inline-block w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition"
                >
                  Log In to Your Account
                </Link>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Link
                href="/"
                className="block w-full text-center border border-gray-300 text-gray-700 font-medium text-sm px-4 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ApplicationSubmittedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <SubmittedContent />
    </Suspense>
  );
}
