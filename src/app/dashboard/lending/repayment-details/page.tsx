"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { calculateLoanCharges } from "@/lib/loanPolicy";

export default function RepaymentDetailsPage() {
  return (
    <Suspense fallback={<section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6"><p className="text-sm text-gray-600">Loading...</p></section>}>
      import { Suspense } from "react";
      import { useRouter, useSearchParams } from "next/navigation";
      import { calculateLoanCharges } from "@/lib/loanPolicy";

      // Face recognition logic removed. No gating, no API calls, no UI.

      export default function RepaymentDetailsPage() {
        // ...existing code for rendering the page, minus face verification logic...
        // You can safely submit/continue without Face ID.
        return (
          <Suspense fallback={<section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6"><p className="text-sm text-gray-600">Loading...</p></section>}>
            {/* Repayment details content here, face recognition removed */}
            <div className="p-8">Repayment details page (face recognition removed).</div>
          </Suspense>
        );
      }
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
            onClick={handleVerifyFace}
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
          >
            Verify Face
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
