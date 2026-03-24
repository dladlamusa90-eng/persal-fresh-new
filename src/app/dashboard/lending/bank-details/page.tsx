"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SOUTH_AFRICAN_BANK_NAMES } from "@/lib/validators/auth";

const accountTypeOptions = [
  { value: "CHEQUE", label: "Cheque account" },
  { value: "SAVINGS", label: "Savings account" },
  { value: "TRANSMISSION", label: "Transmission account" },
] as const;

export default function BankDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [bankName, setBankName] = useState("Capitec");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState<(typeof accountTypeOptions)[number]["value"]>("SAVINGS");

  function withWizardQuery(path: string) {
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
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
          };
        };

        if (!mounted) return;
        if (body.user?.bankName) setBankName(body.user.bankName);
        if (body.user?.accountNumber) setAccountNumber(body.user.accountNumber);
        if (body.user?.accountType) setAccountType(body.user.accountType);
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

  function handleNext() {
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
        <p className="mb-8 text-sm text-gray-700 flex items-center gap-2">
          <span className="text-sky-500 inline-flex" aria-hidden="true">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="10" x2="12" y2="16" />
              <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          Please ensure you select the bank account that your income is paid into.
        </p>

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
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
