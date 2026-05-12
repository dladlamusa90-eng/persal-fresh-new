"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type FaceSession = {
  verified?: boolean;
  enrolled?: boolean;
  status?: string | null;
  lastError?: string | null;
};

type Step = "checking" | "idle" | "camera" | "captured" | "submitting" | "verified" | "failed";

interface FaceIdGateProps {
  onVerified: () => void;
}

export default function FaceIdGate({ onVerified }: FaceIdGateProps) {
  const [step, setStep] = useState<Step>("checking");
  const [statusMessage, setStatusMessage] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      setStatusMessage("Align your face in the frame and capture.");
      setStep("camera");
    } catch {
      setStatusMessage("Unable to access camera. Please allow camera permissions and try again.");
      setStep("failed");
    }
  }, [stopCamera]);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const res = await fetch("/api/faceid/session", { cache: "no-store" });
        if (!mounted) return;

        if (!res.ok) {
          setStatusMessage("Could not check face verification status.");
          setStep("idle");
          return;
        }

        const data = (await res.json()) as FaceSession;
        if (data.verified) {
          setStep("verified");
          onVerified();
          return;
        }

        if (data.status === "ENROLLED") {
          setStatusMessage("Face enrolled. Please complete a live verification selfie.");
        } else if (data.lastError) {
          setStatusMessage(`Previous check: ${data.lastError}`);
        } else {
          setStatusMessage("Face verification is required before continuing.");
        }

        setStep("idle");
      } catch {
        if (!mounted) return;
        setStatusMessage("Could not check face verification status.");
        setStep("idle");
      }
    }

    loadSession();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [onVerified, stopCamera]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    setStatusMessage("Selfie captured. Submit to verify.");
    stopCamera();
    setStep("captured");
  }, [stopCamera]);

  const submit = useCallback(async () => {
    if (!capturedImage) return;
    setStep("submitting");
    setStatusMessage("Submitting selfie for verification...");

    try {
      const response = await fetch("/api/faceid/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieBase64: capturedImage }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        verified?: boolean;
        reason?: string;
        error?: string;
      };

      if (!response.ok) {
        setStep("failed");
        setStatusMessage(body.error || "Face verification failed. Please try again.");
        return;
      }

      if (body.verified) {
        setStep("verified");
        setStatusMessage("Face verification successful.");
        onVerified();
        return;
      }

      setStep("failed");
      setStatusMessage(body.reason || "Verification not approved. Please capture again.");
    } catch {
      setStep("failed");
      setStatusMessage("Verification request failed. Please try again.");
    }
  }, [capturedImage, onVerified]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Face Verification</h2>
      <p className="mt-2 text-sm text-gray-600">{statusMessage || "Checking status..."}</p>

      <div className="mt-4 rounded-xl bg-gray-100 p-3">
        {(step === "camera" || step === "captured" || step === "submitting" || step === "failed") && (
          <div className="flex flex-col items-center gap-3">
            {capturedImage ? (
              <img src={capturedImage} alt="Captured face" className="w-full max-w-sm rounded-lg border border-gray-300" />
            ) : (
              <video ref={videoRef} className="w-full max-w-sm rounded-lg border border-gray-300 bg-black" muted playsInline />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(step === "idle" || step === "failed") && (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Start Camera
          </button>
        )}

        {step === "camera" && (
          <button
            type="button"
            onClick={capture}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Capture Selfie
          </button>
        )}

        {(step === "captured" || step === "failed") && capturedImage && (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Retake
          </button>
        )}

        {step === "captured" && capturedImage && (
          <button
            type="button"
            onClick={() => void submit()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Submit Verification
          </button>
        )}

        {step === "submitting" && (
          <button
            type="button"
            disabled
            className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
          >
            Verifying...
          </button>
        )}
      </div>
    </div>
  );
}
