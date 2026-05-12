"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FaceIdGate from "@/app/components/FaceIdGate";

export default function FaceVerificationPage() {
  return (
    <Suspense fallback={<section className="max-w-5xl mx-auto px-4 py-6"><p className="text-sm text-gray-600">Loading face verification...</p></section>}>
      <FaceVerificationContent />
    </Suspense>
  );
}

function FaceVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard/lending/apply";
  const isPopup = searchParams.get("popup") === "1";

  function handleVerified() {
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "persal-faceid-verified" }, window.location.origin);
      window.close();
      return;
    }

    router.push(returnTo);
  }

  return (
    <section className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-semibold text-persal-dark">Verify Your Face</h1>
        <p className="mt-2 text-sm text-gray-600">
          This selfie check confirms you are the same person who registered. Once verified, you will continue to your application.
        </p>
      </div>

      <FaceIdGate onVerified={handleVerified} />

      <div className="mt-5">
        <button
          type="button"
          onClick={() => {
            if (isPopup && typeof window !== "undefined") {
              window.close();
              return;
            }

            router.push(returnTo);
          }}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {isPopup ? "Close" : "Back"}
        </button>
      </div>
    </section>
  );
}
