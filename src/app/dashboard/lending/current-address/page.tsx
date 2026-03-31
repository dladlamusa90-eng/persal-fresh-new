"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CurrentAddressPage() {
  return (
    <Suspense fallback={<section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6"><p className="text-sm text-gray-600">Loading...</p></section>}>
      <CurrentAddressContent />
    </Suspense>
  );
}

function CurrentAddressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  function withWizardQuery(path: string) {
    const query = searchParams.toString();
    return query ? `${path}?${query}` : path;
  }

  useEffect(() => {
    let mounted = true;

    async function loadAddress() {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) { if (mounted) setLoading(false); return; }
        const body = (await response.json()) as { user?: { address?: string | null } };
        if (mounted) {
          setAddress(body.user?.address ?? "");
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    loadAddress();
    return () => { mounted = false; };
  }, []);

  async function persistAddress() {
    const [profileResponse, draftResponse] = await Promise.all([
      fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      }),
      fetch("/api/loan-application-draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { address } }),
      }),
    ]);

    return profileResponse.ok && draftResponse.ok;
  }

  async function handleSaveAddress() {
    if (saving || loading) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const ok = await persistAddress();
      setSaveMessage(ok ? "Address saved." : "Could not save address.");
    } catch {
      setSaveMessage("Could not save address.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (saving || loading) return;
    setSaving(true);
    try {
      await persistAddress();
    } catch {
      // Continue to next step even if save fails.
    } finally {
      setSaving(false);
    }
    router.push(withWizardQuery("/dashboard/lending/employment-details"));
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">40 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[40%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-8">Current address</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[200px_minmax(0,1fr)] md:items-center">
          <label htmlFor="address" className="text-sm font-medium text-gray-800">Street address</label>
          <div>
            <input
              id="address"
              type="text"
              value={loading ? "" : address}
              onChange={e => setAddress(e.target.value)}
              placeholder={loading ? "Loading..." : "Enter your street address"}
              disabled={loading}
              className="rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-persal-blue disabled:opacity-50"
            />
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSaveAddress}
                disabled={saving || loading}
                className="text-sm font-medium text-persal-blue hover:underline disabled:opacity-60"
              >
                Save new address
              </button>
              {saveMessage && (
                <span className={`text-sm ${saveMessage === "Address saved." ? "text-green-600" : "text-red-600"}`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-between">
          <button
            type="button"
            onClick={() => router.push(withWizardQuery("/dashboard/lending/my-details"))}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving || loading}
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#ff972b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f58a17] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}

