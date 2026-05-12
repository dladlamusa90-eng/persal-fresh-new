"use client";

import { Suspense, useEffect, useState } from "react";
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
  const [amount, setAmount] = useState(1500);
  const [termDays, setTermDays] = useState(90);
  const [faceVerified, setFaceVerified] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [draftRes, faceRes] = await Promise.all([
          fetch("/api/loan-application-draft", { cache: "no-store" }),
          fetch("/api/faceid/session", { cache: "no-store" }),
        ]);

        if (draftRes.ok && mounted) {
          const body = (await draftRes.json()) as {
            draft?: { data?: { requestedAmount?: number; requestedTermDays?: number } };
          };

          if (typeof body.draft?.data?.requestedAmount === "number") {
            setAmount(body.draft.data.requestedAmount);
          }

          if (typeof body.draft?.data?.requestedTermDays === "number") {
            setTermDays(body.draft.data.requestedTermDays);
          }
        }

        if (faceRes.ok && mounted) {
          const faceBody = (await faceRes.json()) as { verified?: boolean };
          setFaceVerified(Boolean(faceBody.verified));
        }
      } catch {
        // Keep defaults; user can still continue.
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const charges = calculateLoanCharges(amount, termDays);
  const totalInterest = charges.interestMonth1 + charges.interestMonth2 + charges.interestMonth3;
  const totalRepayable = charges.totalRepayable;

  function withWizardQuery(path: string) {
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  const applyPath = withWizardQuery("/dashboard/lending/apply");
  const verifyPath = `/dashboard/lending/face-verification?returnTo=${encodeURIComponent(applyPath)}`;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">90 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[90%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-8">Loan repayment details</h1>

        <div className="divide-y divide-gray-200 border-t border-gray-200">
          <div className="py-4 flex items-center justify-between gap-4">
            <p className="text-base font-medium text-gray-700">Loan amount</p>
            <p className="text-base text-gray-700">R {amount.toLocaleString()}</p>
          </div>
          <div className="py-4 flex items-center justify-between gap-4">
            <p className="text-base font-medium text-gray-700">Repayment term</p>
            <p className="text-base text-gray-700">{termDays} days</p>
          </div>
          <div className="py-4 flex items-center justify-between gap-4">
            <p className="text-base font-medium text-gray-700">Total interest</p>
            <p className="text-base text-gray-700">R {totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="py-4 flex items-center justify-between gap-4">
            <p className="text-base font-medium text-gray-700">Initiation fee</p>
            <p className="text-base text-gray-700">R {charges.initiationFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="py-4 flex items-center justify-between gap-4">
            <p className="text-base font-medium text-gray-700">Service fee</p>
            <p className="text-base text-gray-700">R {charges.serviceFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="py-5 flex items-center justify-between gap-4">
            <p className="text-base font-semibold text-gray-900">Total to repay</p>
            <p className="text-lg font-bold text-persal-blue">R {totalRepayable.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {faceVerified ? "Face verification complete. You can continue to submit your application." : "Face verification is required before final application submission."}
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
            onClick={() => router.push(faceVerified ? applyPath : verifyPath)}
            className="inline-flex min-w-[150px] items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
          >
            {faceVerified ? "Continue" : "Verify Face"}
          </button>
        </div>
      </div>
    </section>
  );
}
