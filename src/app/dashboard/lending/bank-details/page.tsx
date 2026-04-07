"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SOUTH_AFRICAN_BANK_NAMES } from "@/lib/validators/auth";

const accountTypeOptions = [
  { value: "CHEQUE", label: "Cheque account" },
  { value: "SAVINGS", label: "Savings account" },
  { value: "TRANSMISSION", label: "Transmission account" },
] as const;

export default function BankDetailsPage() {
  return (
    <Suspense
      fallback={
        <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
            <p className="text-sm text-gray-600">Loading bank details...</p>
          </div>
        </section>
      }
    >
      <BankDetailsContent />
    </Suspense>
  );
}

function BankDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [bankName, setBankName] = useState("Capitec");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<(typeof accountTypeOptions)[number]["value"]>("SAVINGS");
  const [branchCode, setBranchCode] = useState("");
  const [bankVerified, setBankVerified] = useState(false);
  const [stitchStatus, setStitchStatus] = useState<"idle" | "success" | "error">("idle");
  const [stitchErrorMsg, setStitchErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function withWizardQuery(path: string) {
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  // Handle Stitch OAuth callback query params
  useEffect(() => {
    const verified = searchParams.get("stitch_verified");
    const error = searchParams.get("stitch_error");
    if (verified === "true") {
      setStitchStatus("success");
      // Refresh bank details from server (Stitch may have updated them)
      fetch("/api/users/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((body) => {
          if (body.user?.bankName) setBankName(body.user.bankName);
          if (body.user?.accountNumber) setAccountNumber(body.user.accountNumber);
          if (body.user?.accountType) setAccountType(body.user.accountType);
          if (body.user?.branchCode) setBranchCode(body.user.branchCode);
          if (body.user?.bankVerified) setBankVerified(true);
        })
        .catch(() => {});
    } else if (error) {
      setStitchStatus("error");
      const messages: Record<string, string> = {
        session_expired: "Your verification session expired. Please try again.",
        invalid_state: "Security check failed. Please try again.",
        token_exchange_failed: "Could not connect to Stitch. Please try again.",
        access_denied: "You cancelled bank verification.",
      };
      setStitchErrorMsg(messages[error] ?? "Bank verification failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const draftResponse = await fetch("/api/loan-application-draft", { cache: "no-store" });
        if (draftResponse.ok) {
          const draftBody = (await draftResponse.json()) as {
            draft?: {
              data?: {
                bankName?: string;
                accountNumber?: string;
                accountType?: "CHEQUE" | "SAVINGS" | "TRANSMISSION";
                branchCode?: string;
              };
            };
          };

          if (!mounted) return;
          if (draftBody.draft?.data?.bankName) setBankName(draftBody.draft.data.bankName);
          if (draftBody.draft?.data?.accountNumber !== undefined) setAccountNumber(draftBody.draft.data.accountNumber);
          if (draftBody.draft?.data?.accountType) setAccountType(draftBody.draft.data.accountType);
          if (draftBody.draft?.data?.branchCode !== undefined) setBranchCode(draftBody.draft.data.branchCode);
        }

        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) {
          if (mounted) setLoading(false);
          return;
        }

        const body = (await response.json()) as {
          user?: {
            bankName?: string | null;
            accountNumber?: string | null;
            accountType?: "CHEQUE" | "SAVINGS" | "TRANSMISSION" | null;
            branchCode?: string | null;
            bankVerified?: boolean;
          };
        };

        if (!mounted) return;
        if (body.user?.bankName) setBankName(body.user.bankName);
        if (body.user?.accountNumber) setAccountNumber(body.user.accountNumber);
        if (body.user?.accountType) setAccountType(body.user.accountType);
        if (body.user?.branchCode) setBranchCode(body.user.branchCode);
        if (body.user?.bankVerified) setBankVerified(true);
        setLoading(false);
      } catch {
        if (mounted) setLoading(false);
      }
    }

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleNext() {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/loan-application-draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { bankName, accountNumber, accountType, branchCode } }),
      });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
    router.push(withWizardQuery("/dashboard/lending/repayment-details"));
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">75 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[75%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-3">Bank Details</h1>
        <p className="mb-6 text-sm text-gray-700 flex items-center gap-2">
          <span className="text-teal-500 inline-flex" aria-hidden="true">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="10" x2="12" y2="16" />
              <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          Please ensure you select the bank account that your income is paid into.
        </p>

        {/* Stitch bank verification panel */}
        <div className={`mb-8 rounded-xl border px-5 py-4 ${bankVerified ? "border-teal-200 bg-teal-50" : "border-gray-200 bg-gray-50"}`}>
          {bankVerified ? (
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100">
                <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-teal-800">Bank account verified</p>
                <p className="text-xs text-teal-700 mt-0.5">Your bank account was confirmed via Stitch. The details below have been pre-filled.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Verify your bank account instantly</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Use Stitch to securely link your bank and confirm your account details — no manual entry needed.
                </p>
              </div>
              <a
                href={`/api/stitch/link?returnTo=${encodeURIComponent("/dashboard/lending/bank-details" + (searchParams.toString() ? "?" + searchParams.toString() : ""))}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-persal-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-persal-dark"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Verify with Stitch
              </a>
            </div>
          )}

          {stitchStatus === "error" && (
            <p className="mt-3 text-xs text-red-600">{stitchErrorMsg}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_minmax(0,1fr)] md:items-center">
          <label className="text-sm font-medium text-gray-700">Bank Name</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue disabled:opacity-60"
            >
              {SOUTH_AFRICAN_BANK_NAMES.map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <label className="text-sm font-medium text-gray-700">Account Number</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue disabled:opacity-60"
            />
          </div>

          <label className="text-sm font-medium text-gray-700">Account Type</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as (typeof accountTypeOptions)[number]["value"])}
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue disabled:opacity-60"
            >
              {accountTypeOptions.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <label className="text-sm font-medium text-gray-700">Branch Code</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <input
              type="text"
              inputMode="numeric"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={loading}
              className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-10 flex justify-between">
          <button
            type="button"
            onClick={() => router.push(withWizardQuery("/dashboard/lending/monthly-finances"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
          >
            {saving ? "Saving..." : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}
