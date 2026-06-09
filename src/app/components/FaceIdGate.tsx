"use client";

import React, { useCallback, useEffect, useState } from "react";

type FaceSession = {
  verified?: boolean;
  status?: string | null;
  lastError?: string | null;
};

type Step = "checking" | "idle" | "redirecting" | "polling" | "verified" | "failed";

interface FaceIdGateProps {
  onVerified: () => void;
  /** When true, always run a fresh verification even if the session is already verified */
  alwaysCapture?: boolean;
}

const POLL_INTERVAL_MS = 2000;  // 2s between checks
const MAX_POLL_ATTEMPTS = 60;   // ~120 seconds total

export default function FaceIdGate({ onVerified, alwaysCapture = false }: FaceIdGateProps) {
  const [step, setStep] = useState<Step>("checking");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;

    async function pollDiditStatus(sessionId: string): Promise<void> {
      if (!mounted) return;
      try {
        const res = await fetch(
          `/api/didit/status?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        if (!mounted) return;

        if (res.ok) {
          const data = (await res.json()) as { status: string; verified: boolean };
          if (data.verified) {
            sessionStorage.removeItem("didit_pending_session");
            setStep("verified");
            setStatusMessage("Identity verified successfully.");
            onVerified();
            return;
          }
          if (data.status === "Declined") {
            sessionStorage.removeItem("didit_pending_session");
            setStep("failed");
            setStatusMessage("Your verification was declined. Please try again.");
            return;
          }
        }
      } catch {
        // Network error — keep polling
      }

      pollCount++;
      if (pollCount >= MAX_POLL_ATTEMPTS) {
        sessionStorage.removeItem("didit_pending_session");
        setStep("failed");
        setStatusMessage("Verification is taking longer than expected. Please try again.");
        return;
      }
      pollTimer = setTimeout(() => void pollDiditStatus(sessionId), POLL_INTERVAL_MS);
    }

    async function init() {
      // If returning from Didit redirect, resume polling
      const pendingSessionId = sessionStorage.getItem("didit_pending_session");
      if (pendingSessionId) {
        setStep("polling");
        setStatusMessage("Checking your verification result…");
        // First try the faceid session endpoint which checks DB status
        // (Didit may have called our webhook already)
        try {
          const quickCheck = await fetch("/api/faceid/session", { cache: "no-store" });
          if (mounted && quickCheck.ok) {
            const qData = (await quickCheck.json()) as FaceSession;
            if (qData.verified) {
              sessionStorage.removeItem("didit_pending_session");
              setStep("verified");
              setStatusMessage("Identity verified successfully.");
              onVerified();
              return;
            }
          }
        } catch { /* fall through to polling */ }
        await pollDiditStatus(pendingSessionId);
        return;
      }

      // Otherwise check the current DB status
      try {
        const res = await fetch("/api/faceid/session", { cache: "no-store" });
        if (!mounted) return;

        if (!res.ok) {
          setStatusMessage("Could not check verification status.");
          setStep("idle");
          return;
        }

        const data = (await res.json()) as FaceSession;

        if (data.verified && !alwaysCapture) {
          setStep("verified");
          onVerified();
          return;
        }

        if (data.status === "IN_REVIEW") {
          setStatusMessage("Your verification is under review. We'll notify you once approved.");
          setStep("idle");
          return;
        }

        if (data.status === "DECLINED") {
          setStatusMessage("Your last verification was declined. Please try again.");
        } else {
          setStatusMessage("Identity verification is required before continuing.");
        }
        setStep("idle");
      } catch {
        if (!mounted) return;
        setStatusMessage("Could not check verification status.");
        setStep("idle");
      }
    }

    void init();

    return () => {
      mounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [onVerified, alwaysCapture]);

  const startVerification = useCallback(async () => {
    setStep("redirecting");
    setStatusMessage("Opening verification portal…");
    try {
      const callbackUrl = window.location.href;
      const res = await fetch("/api/didit/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        sessionId?: string;
        error?: string;
      };

      if (!res.ok || !body.url) {
        setStep("failed");
        setStatusMessage(body.error ?? "Could not start verification. Please try again.");
        return;
      }

      // Store session ID so we can resume polling when the user returns
      sessionStorage.setItem("didit_pending_session", body.sessionId ?? "");
      window.location.href = body.url;
    } catch {
      setStep("failed");
      setStatusMessage("Could not start verification. Please try again.");
    }
  }, []);

  const retry = useCallback(() => {
    sessionStorage.removeItem("didit_pending_session");
    setStep("idle");
    setStatusMessage("Identity verification is required before continuing.");
  }, []);

  const isLoading = step === "checking" || step === "redirecting" || step === "polling";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Identity Verification</h2>
      <p className="mt-2 text-sm text-gray-600">
        {statusMessage || "Checking verification status…"}
      </p>

      {isLoading && (
        <>
          <p className="mt-3 animate-pulse text-sm text-gray-400">
            {step === "polling"
              ? "Checking result…"
              : step === "redirecting"
                ? "Opening verification portal…"
                : "Loading…"}
          </p>
          {step === "polling" && (
            <p className="mt-3 animate-pulse text-sm text-teal-600 font-medium">
              Verification complete — returning you to the application…
            </p>
          )}
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {(step === "idle" || step === "failed") && (
          <button
            type="button"
            onClick={() => void startVerification()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Verify My Identity
          </button>
        )}

        {step === "failed" && (
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
