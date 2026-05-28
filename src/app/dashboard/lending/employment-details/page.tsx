"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const employmentOptions = ["Employed", "Self-employed", "Retired/Pensioner", "Grant recipient", "Unemployed"];
const incomeFrequencyOptions = ["Monthly", "Weekly", "Fortnightly"];

export default function EmploymentDetailsPage() {
  return (
    <Suspense fallback={<section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6"><p className="text-sm text-gray-600">Loading...</p></section>}>
      <EmploymentDetailsContent />
    </Suspense>
  );
}

function EmploymentDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employmentStatus, setEmploymentStatus] = useState("Employed");
  const [grossIncome, setGrossIncome] = useState("");
  const [netIncome, setNetIncome] = useState("");
  const [incomeFrequency, setIncomeFrequency] = useState("Monthly");
  const [salaryDay, setSalaryDay] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDraft() {
      try {
        const response = await fetch("/api/loan-application-draft", { cache: "no-store" });
        if (!response.ok) {
          if (mounted) setLoading(false);
          return;
        }

        const body = (await response.json()) as {
          draft?: {
            data?: {
              employmentStatus?: string;
              employmentGrossIncome?: string;
              employmentNetIncome?: string;
              incomeFrequency?: string;
              salaryDay?: string;
            };
          };
        };

        const data = body.draft?.data;
        if (!mounted || !data) return;
        if (data.employmentStatus) setEmploymentStatus(data.employmentStatus);
        if (data.employmentGrossIncome !== undefined) setGrossIncome(data.employmentGrossIncome);
        if (data.employmentNetIncome !== undefined) setNetIncome(data.employmentNetIncome);
        if (data.incomeFrequency) setIncomeFrequency(data.incomeFrequency);
        if (data.salaryDay !== undefined) setSalaryDay(data.salaryDay);
      } catch {
        return;
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDraft();
    return () => {
      mounted = false;
    };
  }, []);

  function withWizardQuery(path: string) {
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  async function handleNext() {
    if (saving) return;
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/loan-application-draft", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              employmentStatus,
              employmentGrossIncome: grossIncome,
              employmentNetIncome: netIncome,
              incomeFrequency,
              salaryDay,
            },
          }),
        }),
        fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employmentStatus,
            employmentGrossIncome: grossIncome,
            employmentNetIncome: netIncome,
            incomeFrequency,
            salaryDay,
          }),
        }),
      ]);
    } catch {
      return;
    } finally {
      setSaving(false);
    }
    router.push(withWizardQuery("/dashboard/lending/monthly-finances"));
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">50 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[50%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-8">Employment details</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[350px_minmax(0,1fr)] md:items-center">
          <label className="text-sm font-medium text-gray-700">Employment status</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={employmentStatus}
              onChange={e => setEmploymentStatus(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue"
            >
              {employmentOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <label className="text-sm font-medium text-gray-700">Gross monthly income (before tax &amp; deductions)</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 text-sm">R</span>
            <input
              type="text"
              inputMode="numeric"
              value={grossIncome}
              onChange={e => setGrossIncome(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              className="w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
            />
          </div>

          <label className="text-sm font-medium text-gray-700">Net monthly income (after tax &amp; deductions)</label>
          <div>
            <div className="relative">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 text-sm">R</span>
              <input
                type="text"
                inputMode="numeric"
                value={netIncome}
                onChange={e => setNetIncome(e.target.value.replace(/\D/g, ""))}
                disabled={loading}
                className="w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
              />
            </div>
            <p className="mt-2 text-sm italic text-gray-500">*Your salary amount paid into your bank account</p>
          </div>

          <label className="text-sm font-medium text-gray-700">Frequency of income</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={incomeFrequency}
              onChange={e => setIncomeFrequency(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue"
            >
              {incomeFrequencyOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <label className="text-sm font-medium text-gray-700">Salary day</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <input
              type="text"
              inputMode="numeric"
              value={salaryDay}
              onChange={e => setSalaryDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
              disabled={loading}
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
            />
          </div>
        </div>

        <div className="mt-10 flex justify-between">
          <button
            type="button"
            onClick={() => router.push(withWizardQuery("/dashboard/lending/current-address"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || saving}
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
          >
            {saving ? "Saving..." : "Next"}
          </button>
        </div>
      </div>

    </section>
  );
}
