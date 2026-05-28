"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";

const APPLY_DRAFT_KEY = "guestLoanApplyDraft";

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

type Step =
  | "loading"
  | "idle"
  | "starting"
  | "camera"
  | "countdown"
  | "captured"
  | "verifying"
  | "verified"
  | "submitting"
  | "error";

const STEPS_LABELS = ["Position", "Capture", "Verify", "Submit"];
const STEP_INDEX: Record<Step, number> = {
  loading: 0, idle: 0, starting: 0,
  camera: 1, countdown: 1,
  captured: 2, verifying: 2,
  verified: 3, submitting: 3,
  error: -1,
};

export default function ApplyFaceVerificationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [statusText, setStatusText] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [countdown, setCountdown] = useState(3);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    if (!raw) { router.replace("/apply"); return; }
    try {
      const parsed = JSON.parse(raw) as Draft;
      if (!parsed?.idNumber || !parsed?.email) { router.replace("/apply"); return; }
      setDraft(parsed);
      setStep("idle");
    } catch {
      router.replace("/apply");
    }
  }, [router]);

  const openCamera = useCallback(async () => {
    setStep("starting");
    setStatusText("Requesting camera access...");
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCapturedImage(null);
      setStep("camera");
      setStatusText("Centre your face in the oval and press Capture.");
    } catch {
      setStep("error");
      setStatusText("Camera access was denied. Please allow camera access in your browser settings and try again.");
    }
  }, [stopCamera]);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    setStep("countdown");
    setStatusText("Hold still...");
    let count = 3;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        stopCamera();
        setCapturedImage(dataUrl);
        setStep("captured");
        setStatusText("Selfie captured. Does it look clear?");
      }
    }, 1000);
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setVerificationToken("");
    openCamera();
  }, [openCamera]);

  async function verifyFace() {
    if (!draft || !capturedImage) return;
    setStep("verifying");
    setStatusText("Verifying your identity...");
    try {
      const res = await fetch("/api/guest/face-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber: draft.idNumber, selfieBase64: capturedImage }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        verified?: boolean;
        verificationToken?: string;
        reason?: string;
        error?: string;
      };
      if (!res.ok) {
        setStep("error");
        setStatusText(body.error || "Verification failed. Please try again.");
        return;
      }
      if (!body.verified || !body.verificationToken) {
        setStep("error");
        setStatusText(body.reason || "We could not verify your face. Please retake your selfie in good lighting.");
        return;
      }
      setVerificationToken(body.verificationToken);
      setStep("verified");
      setStatusText("Identity verified successfully.");
    } catch {
      setStep("error");
      setStatusText("Network error. Please check your connection and try again.");
    }
  }

  async function submitApplication() {
    if (!draft || !verificationToken) return;
    setStep("submitting");
    setStatusText("Submitting your application...");
    try {
      const res = await fetch("/api/guest/loan-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, faceVerificationToken: verificationToken }),
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
      sessionStorage.removeItem(APPLY_DRAFT_KEY);
      router.push(`/apply/submitted?ref=${body.applicationId ?? ""}&newUser=${body.isNewUser ? "1" : "0"}`);
    } catch {
      setStep("error");
      setStatusText("Network error while submitting. Please try again.");
    }
  }

  const currentStepIdx = STEP_INDEX[step] ?? 0;
  const showCamera = step === "camera" || step === "countdown" || step === "starting";
  const showPreview = step === "captured" || step === "verifying" || step === "verified" || step === "submitting" || step === "error";

  const borderColor =
    step === "verified"  ? "#22c55e" :
    step === "error"     ? "#ef4444" :
    step === "countdown" ? "#f97316" :
    "#ffffff";

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#0d2240] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

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

      {/* Step progress */}
      <div className="flex items-center justify-center gap-0 px-4 pt-2 pb-4">
        {STEPS_LABELS.map((label, idx) => {
          const done = idx < currentStepIdx;
          const active = idx === currentStepIdx;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-green-500 text-white" : active ? "bg-white text-[#0d2240]" : "bg-white/20 text-white/40"}`}>
                  {done ? "✓" : idx + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${active ? "text-white" : done ? "text-green-400" : "text-white/30"}`}>
                  {label}
                </span>
              </div>
              {idx < STEPS_LABELS.length - 1 && (
                <div className={`h-px w-10 mb-4 mx-1 ${done ? "bg-green-500" : "bg-white/20"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center px-4 pb-8">

        {/* Idle / instructions */}
        {step === "idle" && (
          <div className="w-full max-w-sm mt-4 flex flex-col items-center gap-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Face Verification</h1>
              <p className="text-white/60 text-sm mt-2">We need to confirm your identity before submitting your application.</p>
            </div>

            <div className="w-full bg-white/10 rounded-2xl p-5 space-y-4 text-sm text-white/80">
              {[
                { icon: "💡", text: "Find a well-lit area. Avoid sitting with a bright window behind you." },
                { icon: "📵", text: "Remove sunglasses, hats, or anything covering your face." },
                { icon: "👁️", text: "Look directly into the camera lens." },
                { icon: "📱", text: "Hold your device steady at eye level." },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="text-xl leading-none">{icon}</span>
                  <span className="leading-relaxed">{text}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={openCamera}
              className="w-full bg-white text-[#0d2240] font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-white/90 transition"
            >
              Open Camera
            </button>

            {draft && (
              <p className="text-white/40 text-xs text-center">
                Verifying for: <span className="text-white/70">{draft.fullName}</span>
              </p>
            )}
          </div>
        )}

        {/* Camera / preview */}
        {(showCamera || (showPreview && capturedImage)) && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4 mt-2">

            {/* Frame */}
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10">

              {/* Live video (mirrored) */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showCamera ? "opacity-100" : "opacity-0"}`}
                muted
                playsInline
                style={{ transform: "scaleX(-1)" }}
              />

              {/* Still preview */}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Your selfie"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              )}

              {/* Dark overlay with oval cutout */}
              <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <mask id="face-oval-mask">
                    <rect width="400" height="400" fill="white" />
                    <ellipse cx="200" cy="195" rx="135" ry="168" fill="black" />
                  </mask>
                </defs>
                <rect width="400" height="400" fill="rgba(0,0,0,0.55)" mask="url(#face-oval-mask)" />
                <ellipse cx="200" cy="195" rx="135" ry="168" fill="none" stroke={borderColor} strokeWidth="3" />
                {step === "camera" && (
                  <ellipse cx="200" cy="195" rx="145" ry="178" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" className="animate-ping" />
                )}
              </svg>

              {/* Countdown number */}
              {step === "countdown" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-8xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                    {countdown}
                  </span>
                </div>
              )}

              {/* Verifying spinner */}
              {step === "verifying" && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white font-semibold text-sm">Verifying…</p>
                </div>
              )}

              {/* Verified tick */}
              {step === "verified" && (
                <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
                  <div className="bg-green-500 rounded-full p-4 shadow-xl">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Error cross */}
              {step === "error" && capturedImage && (
                <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
                  <div className="bg-red-500 rounded-full p-4 shadow-xl">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Status */}
            <p className={`text-sm font-medium text-center px-2 min-h-[20px] ${step === "verified" ? "text-green-400" : step === "error" ? "text-red-400" : "text-white/80"}`}>
              {statusText}
            </p>

            {/* Buttons */}
            <div className="w-full space-y-3">
              {step === "camera" && (
                <button type="button" onClick={startCountdown}
                  className="w-full bg-white text-[#0d2240] font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-white/90 transition flex items-center justify-center gap-2">
                  <span className="text-xl">📸</span> Capture Selfie
                </button>
              )}

              {step === "countdown" && (
                <button type="button" disabled
                  className="w-full bg-orange-500/70 text-white font-bold py-4 rounded-2xl text-base cursor-not-allowed">
                  Capturing in {countdown}…
                </button>
              )}

              {step === "captured" && (
                <div className="flex gap-3">
                  <button type="button" onClick={retake}
                    className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-4 rounded-2xl text-sm hover:bg-white/20 transition">
                    Retake
                  </button>
                  <button type="button" onClick={verifyFace}
                    className="flex-[2] bg-white text-[#0d2240] font-bold py-4 rounded-2xl text-sm shadow-lg hover:bg-white/90 transition">
                    Verify Identity
                  </button>
                </div>
              )}

              {step === "error" && capturedImage && (
                <button type="button" onClick={retake}
                  className="w-full bg-white/10 border border-white/20 text-white font-bold py-4 rounded-2xl text-sm hover:bg-white/20 transition">
                  Try Again
                </button>
              )}

              {step === "verified" && (
                <button type="button" onClick={submitApplication}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl text-base shadow-lg transition">
                  Submit Application
                </button>
              )}

              {step === "submitting" && (
                <button type="button" disabled
                  className="w-full bg-green-500/60 text-white font-bold py-4 rounded-2xl text-base cursor-not-allowed flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Submitting…
                </button>
              )}
            </div>

            {/* Loan reminder */}
            {draft && (
              <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex justify-between text-xs text-white/50">
                <span>Loan: <span className="text-white/80 font-semibold">R{draft.amount.toLocaleString()}</span></span>
                <span>Term: <span className="text-white/80 font-semibold">{draft.termDays} days</span></span>
                <span className="text-white/80">{draft.fullName}</span>
              </div>
            )}
          </div>
        )}

        {/* Camera failure (no captured image to show) */}
        {step === "error" && !capturedImage && (
          <div className="w-full max-w-sm mt-10 flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-base">{statusText}</p>
              <p className="text-white/50 text-sm mt-2">Make sure you have allowed camera permissions in your browser.</p>
            </div>
            <button type="button" onClick={openCamera}
              className="w-full bg-white text-[#0d2240] font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-white/90 transition">
              Try Again
            </button>
          </div>
        )}

      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
