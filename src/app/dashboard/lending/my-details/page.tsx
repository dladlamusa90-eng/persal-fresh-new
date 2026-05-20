"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const maritalOptions = ["Unmarried", "Married", "Divorced", "Widowed"];
const homeOptions = ["Tenant", "Owner", "Living With Parents", "Other"];

export default function MyDetailsPage() {
  return (
    <Suspense fallback={<section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6"><p className="text-sm text-gray-600">Loading...</p></section>}>
      <MyDetailsContent />
    </Suspense>
  );
}

function MyDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [maritalStatus, setMaritalStatus] = useState("Unmarried");
  const [homeStatus, setHomeStatus] = useState("Tenant");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
              maritalStatus?: string;
              homeStatus?: string;
            };
          };
        };

        if (!mounted) return;
        if (body.draft?.data?.maritalStatus) setMaritalStatus(body.draft.data.maritalStatus);
        if (body.draft?.data?.homeStatus) setHomeStatus(body.draft.data.homeStatus);
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
      await fetch("/api/loan-application-draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { maritalStatus, homeStatus } }),
      });
    } catch {
      return;
    } finally {
      setSaving(false);
    }
    router.push(withWizardQuery("/dashboard/lending/current-address"));
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">25 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[25%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-8">My details</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
          <label className="text-sm font-medium text-gray-800">Marital status</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={maritalStatus}
              onChange={e => setMaritalStatus(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-gray-200 bg-white pl-4 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue"
            >
              {maritalOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <label className="text-sm font-medium text-gray-800">Home status</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={homeStatus}
              onChange={e => setHomeStatus(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-gray-200 bg-white pl-4 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue"
            >
              {homeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="mt-10 flex justify-between">
          <button
            type="button"
            onClick={() => router.push(withWizardQuery("/dashboard/lending/apply"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || saving}
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#ff972b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f58a17]"
          >
            {saving ? "Saving..." : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}
