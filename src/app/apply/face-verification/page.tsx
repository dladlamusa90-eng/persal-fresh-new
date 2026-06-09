"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState } from "react";

const APPLY_DRAFT_KEY = "guestLoanApplyDraft";
const DIDIT_SESSION_KEY = "didit_guest_session";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20; // ~60 seconds

type UploadedDocument = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type Draft = {
  fullName: string;
  email: string;
  phone: string;
  idNumber: string;
  persalNumber: string;
  grossSalary: number;
  disposableIncome: number;
  amount: number;
  termDays: number;
  bankName: string;
  accountNumber: string;
  accountType: string;
  branchCode: string;
  bankStatementDocument: UploadedDocument;
  guestIdFront?: UploadedDocument;
  debitMandateAccepted: boolean;
  referralCode?: string;
  createdAt: number;
};

type Step = "loading" | "idle" | "redirecting" | "polling" | "verified" | "submitting" | "error";

function ApplyFaceVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [statusText, setStatusText] = useState("");
  const [verificationToken, setVerificationToken] = useState("");

  // Poll Didit for session result
  const pollStatus = useCallback(async (sessionId: string) => {
    let attempts = 0;

    async function poll() {
      try {
        const res = await fetch(
          `/api/guest/didit-status?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            verified: boolean;
            status: string;
            verificationToken?: string;
            error?: string;
          };
          if (data.verified && data.verificationToken) {
            sessionStorage.removeItem(DIDIT_SESSION_KEY);
            setVerificationToken(data.verificationToken);
            setStep("verified");
            setStatusText("Identity verified successfully.");
            return;
          }
          if (data.status === "Declined") {
            sessionStorage.removeItem(DIDIT_SESSION_KEY);
            setStep("error");
            setStatusText("Your verification was declined. Please try again.");
            return;
          }
        }
      } catch {
        // keep polling
      }
      attempts++;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        sessionStorage.removeItem(DIDIT_SESSION_KEY);
        setStep("error");
        setStatusText("Verification is taking longer than expected. Please try again.");
        return;
      }
      setTimeout(() => void poll(), POLL_INTERVAL_MS);
    }

    setStep("polling");
    setStatusText("Checking your verification result…");
    void poll();
  }, []);

  // Auto-submit once verified
  const submitApplication = useCallback(async (currentDraft: Draft, token: string) => {
    setStep("submitting");
    setStatusText("Submitting your application…");
    try {
      const res = await fetch("/api/guest/loan-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...currentDraft, faceVerificationToken: token }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        applicationId?: string;
        isNewUser?: boolean;
      };
      if (!res.ok) {
        setStep("error");
        setStatusText(body.error || "Unable to submit your application. Please try again.");
        return;
      }
      // Save a summary for the confirmation page before clearing the draft
      try {
        sessionStorage.setItem("loanSubmittedSummary", JSON.stringify({
          amount: currentDraft.amount,
          termDays: currentDraft.termDays,
          bankName: currentDraft.bankName,
          accountNumber: currentDraft.accountNumber,
          accountType: currentDraft.accountType,
          fullName: currentDraft.fullName,
        }));
      } catch {}
      sessionStorage.removeItem(APPLY_DRAFT_KEY);
      router.push(`/apply/submitted?ref=${body.applicationId ?? ""}&newUser=${body.isNewUser ? "1" : "0"}`);
    } catch {
      setStep("error");
      setStatusText("Network error while submitting. Please try again.");
    }
  }, [router]);

  useEffect(() => {
    if (step === "verified" && verificationToken && draft) {
      void submitApplication(draft, verificationToken);
    }
  }, [step, verificationToken, draft, submitApplication]);

  // Load draft and check for returning Didit session
  useEffect(() => {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    if (!raw) { router.replace("/apply"); return; }
    let parsedDraft: Draft;
    try {
      parsedDraft = JSON.parse(raw) as Draft;
      if (!parsedDraft?.idNumber || !parsedDraft?.email) { router.replace("/apply"); return; }
    } catch {
      router.replace("/apply");
      return;
    }
    setDraft(parsedDraft);
    // Prefer the verificationSessionId Didit appends to the callback URL; fall back to sessionStorage
    const urlSessionId = searchParams.get("verificationSessionId");
    const pendingSessionId = urlSessionId || sessionStorage.getItem(DIDIT_SESSION_KEY);
    if (pendingSessionId) {
      sessionStorage.setItem(DIDIT_SESSION_KEY, pendingSessionId);
      void pollStatus(pendingSessionId);
    } else {
      setStep("idle");
    }
  }, [router, pollStatus, searchParams]);

  const startVerification = useCallback(async () => {
    if (!draft) return;
    setStep("redirecting");
    setStatusText("Opening verification portal…");
    try {
      const res = await fetch("/api/guest/didit-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber: draft.idNumber }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        sessionId?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        setStep("error");
        setStatusText(body.error ?? "Could not start verification. Please try again.");
        return;
      }
      sessionStorage.setItem(DIDIT_SESSION_KEY, body.sessionId ?? "");
      window.location.href = body.url;
    } catch {
      setStep("error");
      setStatusText("Could not start verification. Please check your connection and try again.");
    }
  }, [draft]);

  const retry = useCallback(() => {
    sessionStorage.removeItem(DIDIT_SESSION_KEY);
    setStep("idle");
    setStatusText("");
  }, []);

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#0d2240] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  const isLoading = step === "redirecting" || step === "polling" || step === "submitting";

  return (
    <div className="min-h-screen bg-[#0d2240] flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#0d2240]">
        <a href="/">
          <img src="/logo.png" alt="Persal" className="h-12 w-auto object-contain brightness-0 invert" />
        </a>
        <Link href="/apply/statement" className="text-white/60 text-sm hover:text-white transition">
          Back
        </Link>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-sm mt-8 flex flex-col items-center gap-6">

          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            {step === "error" ? (
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : step === "verified" || step === "submitting" ? (
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            )}
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              {step === "error" ? "Verification Failed" :
               step === "polling" ? "Checking Result…" :
               step === "submitting" ? "Submitting Application…" :
               step === "verified" ? "Verified!" :
               step === "redirecting" ? "Opening Portal…" :
               "Identity Verification"}
            </h1>
            <p className={`text-sm mt-2 ${step === "error" ? "text-red-400" : step === "verified" || step === "submitting" ? "text-green-400" : "text-white/60"}`}>
              {statusText || "We need to verify your identity before submitting your application."}
            </p>
          </div>

          {/* Info card (idle only) */}
          {step === "idle" && (
            <div className="w-full bg-white/10 rounded-2xl p-5 space-y-4 text-sm text-white/80">
              {[
                { icon: "🪪", text: "Have your South African ID document ready (green ID book or smart ID card)." },
                { icon: "💡", text: "Find a well-lit area. Avoid sitting with a bright window behind you." },
                { icon: "🤳", text: "You will scan both sides of your ID, then take a quick liveness selfie." },
                { icon: "🔒", text: "Your information is encrypted and processed securely." },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="text-xl leading-none">{icon}</span>
                  <span className="leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Spinner */}
          {isLoading && (
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          )}

          {step === "idle" && (
            <button
              type="button"
              onClick={() => void startVerification()}
              className="w-full bg-white text-[#0d2240] font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-white/90 transition"
            >
              Verify My Identity
            </button>
          )}

          {step === "error" && (
            <button
              type="button"
              onClick={retry}
              className="w-full bg-white text-[#0d2240] font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-white/90 transition"
            >
              Try Again
            </button>
          )}

          {/* Loan summary */}
          {draft && (step === "idle" || step === "error") && (
            <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between text-xs text-white/50">
              <span>Loan: <span className="text-white/80 font-semibold">R{draft.amount.toLocaleString()}</span></span>
              <span>Term: <span className="text-white/80 font-semibold">{draft.termDays} days</span></span>
              <span className="text-white/80">{draft.fullName}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d2240] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <ApplyFaceVerificationPage />
    </Suspense>
  );
}
