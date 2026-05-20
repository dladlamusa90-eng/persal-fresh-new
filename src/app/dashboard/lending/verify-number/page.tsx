"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyNumberPage() {
  return (
    <Suspense fallback={<section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6"><p className="text-sm text-gray-600">Loading...</p></section>}>
      <VerifyNumberContent />
    </Suspense>
  );
}

function VerifyNumberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Read loan and term from query string
  const loanAmount = Number(searchParams.get("loan")) || 1500;
  const termDays = Number(searchParams.get("termDays")) || Number(searchParams.get("term")) || 30;

  function withWizardQuery(path: string) {
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  useEffect(() => {
    let mounted = true;

    async function loadPhone() {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) {
          if (mounted) setLoading(false);
          return;
        }

        const body = (await response.json()) as {
          user?: {
            phone?: string | null;
          };
        };

        if (mounted) {
          setPhone(body.user?.phone ?? "");
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    loadPhone();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleNext() {
    if (loading || saving) return;

    setSaving(true);
    setSaveMessage("");

    try {
      await fetch("/api/loan-application-draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { phone } }),
      });
    } catch {
      setSaveMessage("Could not save number. You can still continue.");
    } finally {
      setSaving(false);
    }

    router.push(withWizardQuery("/dashboard/lending/my-details"));
  }


  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">15 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[15%] bg-lime-500" />
          </div>
        </div>

        {/* Loan summary reflecting current application */}
        <div className="mb-6 flex gap-8 items-center">
          <div>
            <div className="text-xs text-gray-500">Loan Amount</div>
            <div className="text-lg font-bold text-persal-dark">R{loanAmount.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Loan Period</div>
            <div className="text-lg font-bold text-persal-dark">{termDays} days</div>
          </div>
        </div>

        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-normal leading-tight text-persal-dark">Verify your number</h1>
          <p className="mt-2 text-sm text-gray-600">
            Before you proceed, please check if your cellphone number is correct.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
          <div className="text-sm font-medium text-gray-700">
            Cellphone number
          </div>

          <div>
            <input
              type="text"
              value={loading ? "" : phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={loading ? "Loading..." : "Enter cellphone number"}
              disabled={loading || saving}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue disabled:opacity-60"
            />
            <div className="mt-2 flex items-center gap-4">
              <Link
                href="/dashboard/profile"
                className="inline-block text-sm text-[#0f9a9a] transition hover:underline"
              >
                Update full profile
              </Link>
              {saveMessage && <span className="text-xs text-amber-700">{saveMessage}</span>}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-between">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
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
