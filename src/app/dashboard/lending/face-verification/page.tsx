"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "checking" | "idle" | "camera" | "captured" | "submitting" | "verified" | "failed";

type FaceSession = {
  verified?: boolean;
  enrolled?: boolean;
  status?: string;
};

export default function FaceVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("checking");
  const [enrolled, setEnrolled] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("PENDING");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const returnTo = searchParams.get("returnTo") || "/dashboard/lending/apply";
  const finishTo = searchParams.get("finishTo") || "/dashboard/lending/statement";

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const res = await fetch("/api/faceid/session", { cache: "no-store" });
        if (!mounted) return;

        if (!res.ok) {
          setStep("idle");
          setStatusMessage("Could not load verification session. You can still try again.");
          return;
        }

        const data = (await res.json()) as FaceSession;
        setSessionStatus(String(data.status ?? "PENDING"));

        if (data.verified) {
          setStep("verified");
          return;
        }

        setEnrolled(Boolean(data.enrolled));
        setStep("idle");
      } catch {
        if (!mounted) return;
        setStep("idle");
        setStatusMessage("Network issue while loading verification. Please try again.");
      }
    }

    void loadSession();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (step !== "camera" || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setStatusMessage("Unable to start camera preview. Please try again.");
      setStep("idle");
    });
  }, [step]);

  const startCamera = useCallback(async () => {
    setStatusMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      setStep("camera");
    } catch {
      setStatusMessage("Camera access denied. Allow camera permission and try again.");
    }
  }, []);

  const takeSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    setCapturedImage(dataUrl);
    stopCamera();
    setStep("captured");
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setStatusMessage("");
    void startCamera();
  }, [startCamera]);

  const reset = useCallback(() => {
    setCapturedImage(null);
    setStatusMessage("");
    stopCamera();
    setStep("idle");
  }, [stopCamera]);

  const submitSelfie = useCallback(async () => {
    if (!capturedImage) return;

    setStep("submitting");
    setStatusMessage("");

    try {
      const res = await fetch("/api/faceid/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfie: capturedImage, jobType: enrolled ? 2 : 1 }),
      });

      const data = (await res.json()) as {
        verified?: boolean;
        enrolled?: boolean;
        message?: string;
        error?: string;
      };

      if (res.ok && data.verified) {
        setStep("verified");
        setSessionStatus("VERIFIED");
        return;
      }

      if (res.ok && !data.verified && data.enrolled) {
        setEnrolled(true);
        setStep("idle");
        setStatusMessage("Face registered. Authenticate once more to continue.");
        return;
      }

      setStep("failed");
      setStatusMessage(data.error ?? data.message ?? "Face verification failed. Try again in better lighting.");
    } catch {
      setStep("failed");
      setStatusMessage("Network error during verification. Please try again.");
    }
  }, [capturedImage, enrolled]);

  function getStatusPill() {
    if (sessionStatus === "VERIFIED") {
      return <span className="rounded-full bg-green-100 text-green-800 text-xs font-semibold px-3 py-1">Verified</span>;
    }
    if (sessionStatus === "FAILED") {
      return <span className="rounded-full bg-red-100 text-red-800 text-xs font-semibold px-3 py-1">Retry Needed</span>;
    }
    return <span className="rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1">Pending</span>;
  }

  return (
    <section className="min-h-screen bg-[#f6f7f9] px-4 py-6 md:py-10">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0f172a] via-[#0f766e] to-[#0b4f8c] px-5 md:px-8 py-6 md:py-8 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-200">Identity Check</p>
                <h1 className="text-2xl md:text-3xl font-semibold mt-2">Face Verification</h1>
              </div>
              {getStatusPill()}
            </div>
          </div>

          <div className="p-5 md:p-8 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6 md:gap-8">
            <div>
              <canvas ref={canvasRef} className="hidden" />

              {step === "checking" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="w-9 h-9 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-3 text-sm text-slate-600">Preparing your secure verification session...</p>
                </div>
              )}

              {step === "idle" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
                    <h2 className="text-lg font-semibold text-slate-900">Ready to verify</h2>
                    <p className="text-sm text-slate-600 mt-2">
                      {enrolled
                        ? "Authenticate your face to confirm this is really you."
                        : "Register your face once, then authenticate to continue."}
                    </p>
                    {statusMessage && (
                      <p className="mt-3 rounded-xl bg-amber-100 text-amber-900 text-sm px-3 py-2">{statusMessage}</p>
                    )}
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-4 w-full md:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition"
                    >
                      {enrolled ? "Authenticate Face" : "Start Face Verification"}
                    </button>
                  </div>
                </div>
              )}

              {step === "camera" && (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200" style={{ aspectRatio: "3 / 4" }}>
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-56 rounded-full border-4 border-white/80 border-dashed" />
                    </div>
                    <div className="absolute left-0 right-0 bottom-0 bg-black/50 text-white text-xs px-3 py-2 text-center">
                      Keep your face centered, remove sunglasses, and look straight ahead.
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={reset}
                      className="flex-1 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm py-2.5 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={takeSelfie}
                      className="flex-1 rounded-xl bg-teal-600 text-white font-semibold text-sm py-2.5 hover:bg-teal-700 transition"
                    >
                      Capture Selfie
                    </button>
                  </div>
                </div>
              )}

              {step === "captured" && capturedImage && (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black" style={{ aspectRatio: "3 / 4" }}>
                    <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={retake}
                      className="flex-1 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm py-2.5 hover:bg-slate-50 transition"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={submitSelfie}
                      className="flex-1 rounded-xl bg-teal-600 text-white font-semibold text-sm py-2.5 hover:bg-teal-700 transition"
                    >
                      Submit Verification
                    </button>
                  </div>
                </div>
              )}

              {step === "submitting" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-sm font-semibold text-teal-700">Verifying your face...</p>
                  <p className="mt-1 text-xs text-slate-500">This usually completes in a few seconds.</p>
                </div>
              )}

              {step === "failed" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 md:p-6 space-y-4">
                  <h2 className="text-base font-semibold text-red-800">Verification failed</h2>
                  <p className="text-sm text-red-700">{statusMessage}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {step === "verified" && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-green-800">Verification successful</h2>
                  <p className="text-sm text-green-700">
                    Your face has been verified. Finish your application to view your loan statement.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(finishTo)}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition"
                    >
                      Finish Application
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6 h-fit">
              <h3 className="text-base font-semibold text-slate-900">Before you start</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Use a well-lit space with your face clearly visible.</li>
                <li>Remove hats, masks, and dark glasses.</li>
                <li>Hold your phone steady and keep your head centered.</li>
                <li>Complete this step yourself. Do not use someone else&apos;s photo.</li>
              </ul>

              <div className="mt-5 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => router.push(returnTo)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-100 transition"
                >
                  Back to previous step
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
