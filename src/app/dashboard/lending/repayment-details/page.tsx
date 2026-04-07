"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { calculateLoanCharges } from "@/lib/loanPolicy";

export default function RepaymentDetailsPage() {
  return (
    <Suspense fallback={<section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6"><p className="text-sm text-gray-600">Loading...</p></section>}>
      <RepaymentDetailsContent />
    </Suspense>
  );
}

function RepaymentDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFeesBreakdown, setShowFeesBreakdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const rawLoan = Number(searchParams.get("loan"));
  const loanAmount = Number.isFinite(rawLoan) && rawLoan >= 100 ? Math.min(5000, rawLoan) : 1500;

  const rawTerm = Number(searchParams.get("term"));
  const rawTermDays = Number(searchParams.get("termDays"));
  const fallbackTerm = Math.max(1, Math.min(3, Math.ceil(((Number.isFinite(rawTermDays) && rawTermDays > 0) ? rawTermDays : 60) / 30)));
  const term = Number.isFinite(rawTerm) && rawTerm >= 1 ? Math.max(1, Math.min(3, Math.floor(rawTerm))) : fallbackTerm;

  const charges = calculateLoanCharges(loanAmount, term * 30);
  const totalInterest = charges.interestMonth1 + charges.interestMonth2 + charges.interestMonth3;
  const totalToRepay = loanAmount + charges.totalCost;

  function formatCurrency(value: number) {
    return value.toFixed(2);
  }

  function withWizardQuery(path: string) {
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  async function handleContinue() {
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      // If user already has an open application/loan, show status directly.
      const loanStateResponse = await fetch("/api/loans/me", { cache: "no-store" });
      if (loanStateResponse.ok) {
        const loanState = (await loanStateResponse.json()) as {
          latestLoan?: { status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID" } | null;
        };
        const latestStatus = loanState.latestLoan?.status;
        if (latestStatus === "PENDING" || latestStatus === "APPROVED") {
          router.push("/dashboard/lending/application-status");
          return;
        }
      }

      const [userResponse, draftResponse] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/loan-application-draft", { cache: "no-store" }),
      ]);

      if (!userResponse.ok) {
        setError("Unable to load your profile. Please try again.");
        return;
      }

      const userBody = (await userResponse.json()) as {
        user?: {
          phone?: string | null;
          idNumber?: string | null;
          persalNumber?: string | null;
          bankName?: string | null;
          accountNumber?: string | null;
          accountType?: "CHEQUE" | "SAVINGS" | "TRANSMISSION" | null;
          branchCode?: string | null;
        };
      };

      const draftBody = draftResponse.ok
        ? ((await draftResponse.json()) as {
            draft?: {
              data?: {
                requestedGrossSalary?: number | string;
                monthlyGrossIncome?: number | string;
                employmentGrossIncome?: number | string;
                requestedDisposableIncome?: number | string;
                calculatedDisposableIncome?: number | string;
                phone?: string;
                idNumber?: string;
                persalNumber?: string;
                bankName?: string;
                accountNumber?: string;
                accountType?: "CHEQUE" | "SAVINGS" | "TRANSMISSION";
                branchCode?: string;
              };
            };
          })
        : undefined;

      const draftData = draftBody?.draft?.data ?? {};
      const grossSalary = Number(
        draftData.requestedGrossSalary ?? draftData.monthlyGrossIncome ?? draftData.employmentGrossIncome ?? 0
      );
      const disposableIncome = Number(
        draftData.requestedDisposableIncome ?? draftData.calculatedDisposableIncome ?? 0
      );

      const resolvedPhone = draftData.phone ?? userBody.user?.phone ?? "";
      const resolvedIdNumber = draftData.idNumber ?? userBody.user?.idNumber ?? "";
      const resolvedPersalNumber = draftData.persalNumber ?? userBody.user?.persalNumber ?? "";
      const resolvedBankName = draftData.bankName ?? userBody.user?.bankName ?? "";
      const resolvedAccountNumber = draftData.accountNumber ?? userBody.user?.accountNumber ?? "";
      const resolvedAccountType = draftData.accountType ?? userBody.user?.accountType ?? "SAVINGS";
      const resolvedBranchCode = draftData.branchCode ?? userBody.user?.branchCode ?? "";

      if (!resolvedPhone || !resolvedIdNumber || !resolvedPersalNumber || !resolvedBankName || !resolvedAccountNumber || !resolvedBranchCode) {
        setError("Please complete your profile and banking details before submitting.");
        return;
      }

      const applyResponse = await fetch("/api/loans/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: loanAmount,
          termDays: term * 30,
          grossSalary,
          disposableIncome,
          phone: resolvedPhone,
          idNumber: resolvedIdNumber,
          persalNumber: resolvedPersalNumber,
          bankName: resolvedBankName,
          accountNumber: resolvedAccountNumber,
          accountType: resolvedAccountType,
          branchCode: resolvedBranchCode,
          debitMandateAccepted: true,
        }),
      });

      if (applyResponse.ok || applyResponse.status === 409) {
        router.push("/dashboard/lending/application-status");
        return;
      }

      const body = (await applyResponse.json()) as { error?: string };
      setError(body.error ?? "Could not submit your application. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-8">
          <div className="text-sm font-medium text-persal-dark tracking-tight">90 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[90%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-8">Loan repayment details</h1>

        <div className="divide-y divide-gray-200 border-t border-gray-200">
          <div className="py-5 flex items-center justify-between gap-4">
            <p className="text-base font-medium text-gray-700">Start date</p>
            <p className="text-base text-gray-700">Upon loan cash payout</p>
          </div>

          <div className="py-5 flex items-center justify-between gap-4">
            <p className="text-base font-medium text-gray-700 inline-flex items-center gap-2">
              Instalment amount
              <button
                type="button"
                onClick={() => setShowFeesBreakdown(true)}
                className="text-orange-500 hover:text-orange-600 inline-flex"
                aria-label="Open fees breakdown"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="10" x2="12" y2="16" />
                  <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </button>
            </p>
            <p className="text-base text-gray-700">R {formatCurrency(totalToRepay)}</p>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(withWizardQuery("/dashboard/lending/bank-details"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={submitting}
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
          >
            {submitting ? "Submitting..." : "Continue"}
          </button>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      {showFeesBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-label="Fees Breakdown">
          <div className="w-full max-w-[340px] rounded-xl overflow-hidden bg-gray-100 shadow-2xl border border-gray-200">
            <div className="bg-orange-500 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-semibold text-xl">Fees Breakdown</h3>
              <button
                type="button"
                onClick={() => setShowFeesBreakdown(false)}
                className="text-white text-xl leading-none"
                aria-label="Close fees breakdown"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-4 text-base text-gray-700">
              <p className="text-teal-600 font-semibold mb-3">Loan fees &amp; interest</p>

              <div className="border-t border-gray-200">
                <div className="py-3 flex items-center justify-between">
                  <span>Initiation fee</span>
                  <span className="font-semibold">R {formatCurrency(charges.initiationFee)}</span>
                </div>
                <div className="py-3 flex items-center justify-between border-t border-gray-200">
                  <span>Service fees</span>
                  <span className="font-semibold">R {formatCurrency(charges.serviceFee)}</span>
                </div>
                <div className="py-3 flex items-center justify-between border-t border-gray-200">
                  <span>Total interest</span>
                  <span className="font-semibold">R {formatCurrency(totalInterest)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 mt-2 pt-3 flex items-center justify-between text-teal-600 font-semibold">
                <span>Total to repay</span>
                <span>R {formatCurrency(totalToRepay)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
