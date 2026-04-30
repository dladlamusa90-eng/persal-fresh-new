"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface FaceIdGateProps {
  onVerified: () => void;
}

type Step = "checking" | "idle" | "camera" | "captured" | "submitting" | "verified" | "failed";

export default function FaceIdGate({ onVerified }: FaceIdGateProps) {
  const [step, setStep] = useState<Step>("checking");
  const [statusMessage, setStatusMessage] = useState("");
  const [enrolled, setEnrolled] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/faceid/session");
        if (!mounted) return;
        if (res.ok) {
          const data = (await res.json()) as { verified?: boolean; enrolled?: boolean };
          if (data.verified) {
            setStep("verified");
            onVerified();
          } else {
            setEnrolled(Boolean(data.enrolled));
            setStep("idle");
          }
        } else {
          setStep("idle");
        }
      } catch {
        if (mounted) setStep("idle");
      }
    }
    void checkStatus();
    return () => {
      mounted = false;
    };
  }, [onVerified]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
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
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setStep("camera");
    } catch {
      setStatusMessage(
        "Camera access denied. Please allow camera access in your browser settings and try again."
      );
    }
  }, []);

  const takeSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
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
        error?: string;
        message?: string;
      };

      if (res.ok && data.verified) {
        setStep("verified");
        onVerified();
      } else if (res.ok && !data.verified && data.enrolled) {
        // First-time enrollment succeeded but auth needed next
        setEnrolled(true);
        setStep("idle");
        setStatusMessage(
          "Your face has been registered. Please now authenticate your face to continue."
        );
      } else {
        setStep("failed");
        setStatusMessage(
          data.error ??
            data.message ??
            "Face verification failed. Please ensure good lighting and try again."
        );
      }
    } catch {
      setStep("failed");
      setStatusMessage("Network error. Please try again.");
    }
  }, [capturedImage, enrolled, onVerified]);

  if (step === "checking") return null;

  if (step === "verified") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <span className="text-green-600 text-xl font-bold">✓</span>
        <span className="text-green-700 font-semibold text-sm">Face verified. You may submit your application.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
      {/* Hidden canvas — always in DOM for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div>
        <h3 className="font-semibold text-amber-900 flex items-center gap-2 text-sm">
          <span>🔐</span> Face Verification Required
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          {enrolled
            ? "Authenticate your face to confirm your identity before submitting."
            : "Register your face once to verify your identity before your first loan application."}
        </p>
      </div>

      {step === "idle" && (
        <div className="space-y-2">
          {statusMessage && (
            <p className="text-sm text-amber-800 bg-amber-100 rounded-lg px-3 py-2">{statusMessage}</p>
          )}
          <button
            type="button"
            onClick={startCamera}
            className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition text-sm"
          >
            {enrolled ? "📷 Authenticate Face" : "📷 Register Face"}
          </button>
        </div>
      )}

      {step === "camera" && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {/* Face oval guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-44 rounded-full border-4 border-white/70 border-dashed" />
            </div>
          </div>
          <p className="text-xs text-amber-700 text-center">
            Center your face in the oval and tap Take Selfie.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={takeSelfie}
              className="flex-1 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700"
            >
              Take Selfie
            </button>
          </div>
        </div>
      )}

      {step === "captured" && capturedImage && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <img src={capturedImage} alt="Your selfie" className="w-full object-cover" />
          </div>
          <p className="text-xs text-amber-700 text-center">
            Happy with this photo? Submit to verify your identity.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retake}
              className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={submitSelfie}
              className="flex-1 py-2 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700"
            >
              Submit & Verify
            </button>
          </div>
        </div>
      )}

      {step === "submitting" && (
        <div className="text-center py-6 space-y-2">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-teal-700 font-semibold">Verifying your face…</p>
          <p className="text-xs text-teal-600">This may take a few seconds.</p>
        </div>
      )}

      {step === "failed" && (
        <div className="space-y-3">
          <p className="text-sm text-red-600 text-center">{statusMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
