"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const APPLY_DRAFT_KEY = "guestLoanApplyDraft";

function formatWithCommas(value: number) {
  const rounded = Math.round(value);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

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
  debitMandateAccepted: boolean;
  createdAt: number;
};

type Step = "loading" | "idle" | "camera" | "captured" | "verifying" | "verified" | "submitting" | "failed";

export default function ApplyFaceVerificationPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState("Preparing face verification...");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const repayDateLabel = useMemo(() => {
    if (!draft) return "";
    const date = new Date();
    date.setDate(date.getDate() + draft.termDays);
    return date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  }, [draft]);

  const stopCamera = useCallback(() => {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
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
      setMessage("Align your face in the frame, then capture.");
      setStep("camera");
    } catch {
      setMessage("Unable to access your camera. Please allow camera access and try again.");
      setStep("failed");
    }
  }, [stopCamera]);

  useEffect(() => {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    if (!raw) {
      router.replace("/apply");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Draft;
      if (!parsed?.idNumber || !parsed?.email) {
        router.replace("/apply");
        return;
      }
      setDraft(parsed);
      setStep("idle");
      setMessage("Capture a live selfie to verify your face against your ID.");
    } catch {
      router.replace("/apply");
    }

    return () => {
      stopCamera();
    };
  }, [router, stopCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const image = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(image);
    setStep("captured");
    setMessage("Selfie captured. Verify now to continue.");
    stopCamera();
  }, [stopCamera]);

  async function verifyFace() {
    if (!draft || !capturedImage) return;

    setStep("verifying");
    setMessage("Checking your selfie against your ID details...");

    try {
      const res = await fetch("/api/guest/face-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idNumber: draft.idNumber,
          selfieBase64: capturedImage,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        verified?: boolean;
        verificationToken?: string;
        reason?: string;
        error?: string;
      };

      if (!res.ok) {
        setStep("failed");
        setMessage(body.error || "Face verification is currently unavailable. Please try again.");
        return;
      }

      if (!body.verified || !body.verificationToken) {
        setStep("failed");
        setMessage(body.reason || "Face verification failed. Please capture another selfie and try again.");
        return;
      }

      setVerificationToken(body.verificationToken);
      setStep("verified");
      setMessage("Verification successful. You can now submit your loan application.");
    } catch {
      setStep("failed");
      setMessage("Network error while verifying your face. Please try again.");
    }
  }

  function onPhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStep("failed");
      setMessage("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl || dataUrl.length < 100) {
        setStep("failed");
        setMessage("Uploaded photo is invalid. Please try another image.");
        return;
      }

      stopCamera();
      setCapturedImage(dataUrl);
      setStep("captured");
      setMessage("Photo uploaded. Verify now to continue.");
    };

    reader.onerror = () => {
      setStep("failed");
      setMessage("Could not read the uploaded photo. Please try again.");
    };

    reader.readAsDataURL(file);
  }

  async function submitFinalApplication() {
    if (!draft || !verificationToken) return;

    setStep("submitting");
    setMessage("Submitting your application...");

    try {
      const res = await fetch("/api/guest/loan-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          faceVerificationToken: verificationToken,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string; applicationId?: string; isNewUser?: boolean };

      if (!res.ok) {
        setStep("failed");
        setMessage(body.error || "Unable to submit application. Please try again.");
        return;
      }

      sessionStorage.removeItem(APPLY_DRAFT_KEY);
      router.push(`/apply/submitted?ref=${body.applicationId ?? ""}&newUser=${body.isNewUser ? "1" : "0"}`);
    } catch {
      setStep("failed");
      setMessage("Network error while submitting application. Please try again.");
    }
  }

  const canCapture = step === "camera";
  const canVerify = step === "captured";
  const canSubmit = step === "verified";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
        <div className="flex w-full max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Persal" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: "100px", height: "100px" }} />
          </a>
          <nav className="flex gap-4 items-center">
            <Link href="/auth/login" className="text-persal-dark font-medium px-4 py-2 rounded hover:bg-teal-50 transition">
              Sign In
            </Link>
            <Link href="/auth/signup?from=apply" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">
              SignUp
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-persal-dark text-white rounded-2xl p-6 mb-8 shadow-lg">
          <h1 className="text-xl font-bold mb-1">Face Verification</h1>
          <p className="text-teal-200 text-sm mb-5">Verify your face against your SA ID details before final submission.</p>
          {draft && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-white">R{formatWithCommas(draft.amount)}</div>
                <div className="text-teal-300 text-xs mt-1">Loan Amount</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{draft.termDays}</div>
                <div className="text-teal-300 text-xs mt-1">Days</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-300">{repayDateLabel}</div>
                <div className="text-teal-300 text-xs mt-1">Repay Date</div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="text-base font-semibold text-persal-dark mb-3">Live Selfie Check</h2>
          <p className="text-sm text-gray-600 mb-2">{message}</p>
          <p className="text-xs text-gray-500 mb-4">First-time users can either capture a live selfie or upload a clear face photo.</p>

          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-100 overflow-hidden aspect-square max-w-md mx-auto flex items-center justify-center">
            {capturedImage ? (
              <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-5 flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={startCamera}
              disabled={step === "verifying" || step === "submitting"}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {step === "camera" ? "Camera Ready" : "Open Camera"}
            </button>

            <button
              type="button"
              onClick={capture}
              disabled={!canCapture}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Capture Selfie
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={step === "verifying" || step === "submitting"}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Upload Photo
            </button>

            <button
              type="button"
              onClick={verifyFace}
              disabled={!canVerify}
              className="px-4 py-2 rounded-lg bg-persal-blue text-white font-semibold hover:bg-persal-dark disabled:opacity-50"
            >
              Verify Face
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={submitFinalApplication}
            disabled={!canSubmit}
            className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base shadow-lg transition"
          >
            {step === "submitting" ? "Submitting..." : "Submit Application"}
          </button>

          <div className="mt-4 text-center text-sm text-gray-600">
            <Link href="/apply" className="underline text-persal-blue">Back to Application Details</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
