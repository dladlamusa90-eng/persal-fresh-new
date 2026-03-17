"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CurrentAddressPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

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

  async function handleNext() {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        router.push("/dashboard/lending/apply");
      }, 1800);
    } catch {
      router.push("/dashboard/lending/apply");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex items-center gap-3">
            <svg className="h-6 w-6 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-gray-800 font-medium">Address saved successfully.</span>
          </div>
        </div>
      )}

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
          <input
            id="address"
            type="text"
            value={loading ? "" : address}
            onChange={e => setAddress(e.target.value)}
            placeholder={loading ? "Loading..." : "Enter your street address"}
            disabled={loading}
            className="rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-persal-blue disabled:opacity-50"
          />
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            disabled={saving || loading}
            className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-[#ff972b] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#f58a17] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}

