"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppFooter from "@/app/components/AppFooter";

type FaceStep = "idle" | "camera" | "captured";

type SignupDraft = {
  firstName: string;
  surname: string;
  idNumber: string;
  persalNumber: string;
  phone: string;
  email: string;
  password: string;
  address: string;
};

const SIGNUP_DRAFT_KEY = "signup-application-draft-v1";

function FaceRegistrationContent() {
  const router = useRouter();
  const [draft, setDraft] = useState<SignupDraft | null>(null);
  const [faceStep, setFaceStep] = useState<FaceStep>("idle");
  const [registrationFacePhoto, setRegistrationFacePhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    try {
      const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
      if (!raw) {
        setError("Please complete your details first.");
        return;
      }

      const parsed = JSON.parse(raw) as SignupDraft;
      if (!parsed?.firstName || !parsed?.surname || !parsed?.idNumber || !parsed?.persalNumber || !parsed?.phone || !parsed?.email || !parsed?.password || !parsed?.address) {
        setError("Please complete your details first.");
        return;
      }

      setDraft(parsed);
    } catch {
      setError("Unable to load your application details. Please start again.");
    }
  }, []);

  useEffect(() => {
    if (faceStep !== "camera" || !videoRef.current || !streamRef.current) return;

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setError("Unable to start camera preview. Please try again.");
      setFaceStep("idle");
    });
  }, [faceStep]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  async function startFaceCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      setFaceStep("camera");
    } catch {
      setError("Camera access denied. Please allow camera permission to register your face.");
    }
  }

  function captureFace() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setRegistrationFacePhoto(dataUrl);
    stopCamera();
    setFaceStep("captured");
  }

  async function retakeFace() {
    setRegistrationFacePhoto(null);
    await startFaceCamera();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!draft) {
      setError("Please complete your details first.");
      return;
    }

    if (!registrationFacePhoto) {
      setError("Face registration is required. Please capture your face before submitting.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: `${draft.firstName} ${draft.surname}`.trim(),
          email: draft.email,
          password: draft.password,
          idNumber: draft.idNumber,
          persalNumber: draft.persalNumber,
          phone: draft.phone,
          address: draft.address,
          registrationFacePhoto,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error || "Application submission failed. Please try again.");
        return;
      }

      sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
      router.push("/auth/application-submitted");
    } catch {
      setError("Application submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="relative min-h-screen bg-neutral-100 overflow-hidden">
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
            <div className="flex w-full max-w-5xl items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Persal Logo" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: "100px", height: "100px" }} />
              </a>
              <nav className="flex gap-4 items-center">
                <a href="/auth/login" className="text-persal-dark font-medium px-4 py-2 rounded hover:bg-teal-50 transition">Login</a>
                <span className="px-4 py-2 rounded bg-gray-200 text-gray-500 font-semibold cursor-not-allowed select-none">Apply</span>
              </nav>
            </div>
          </header>

          <div className="w-full px-4 md:px-8 pt-4 pb-10">
            <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
              <h1 className="text-2xl md:text-3xl text-gray-800 font-medium mb-2">Face Registration</h1>
              <p className="text-sm md:text-base text-gray-600 mb-7">
                Capture your face to complete your application. This selfie is securely matched during future verification.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start">
                <label className="text-gray-700 text-lg md:text-xl md:pt-2">Face Registration</label>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-5">
                  <canvas ref={canvasRef} className="hidden" />
                  <p className="text-sm text-amber-900 font-semibold">Required for first-time application</p>
                  <p className="mt-1 text-xs md:text-sm text-amber-800">
                    We store this as your registered face and compare it with your live face when you apply for a loan.
                  </p>

                  {faceStep === "idle" && !registrationFacePhoto && (
                    <button
                      type="button"
                      onClick={() => void startFaceCamera()}
                      className="mt-4 inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
                    >
                      Start Camera
                    </button>
                  )}

                  {faceStep === "camera" && (
                    <div className="mt-4 space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-amber-200 bg-black" style={{ aspectRatio: "3 / 4" }}>
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            setFaceStep("idle");
                          }}
                          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={captureFace}
                          className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
                        >
                          Capture Face
                        </button>
                      </div>
                    </div>
                  )}

                  {registrationFacePhoto && faceStep === "captured" && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl overflow-hidden border border-amber-200 bg-black" style={{ aspectRatio: "3 / 4" }}>
                        <img src={registrationFacePhoto} alt="Registered face" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex gap-3">
                        <span className="flex-1 rounded-xl bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-800 text-center">Face captured</span>
                        <button
                          type="button"
                          onClick={() => void retakeFace()}
                          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/auth/signup")}
                  className="text-teal-600 hover:underline text-base md:text-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !draft}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-7 py-2.5 text-lg md:text-xl min-w-[220px] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>

              {!draft && (
                <p className="mt-5 text-sm font-medium text-amber-700">
                  Details are missing. Go back to the details screen and complete your application information.
                </p>
              )}
              {error && <div className="mt-5 text-sm font-medium text-red-600">{error}</div>}
              <p className="mt-4 text-sm text-gray-700">
                Already applied? <Link href="/auth/login" className="text-teal-600 hover:underline">Log in</Link>
              </p>
            </form>
          </div>
        </div>
      </section>
      <AppFooter />
    </>
  );
}

export default function FaceRegistrationPage() {
  return (
    <Suspense fallback={<section className="relative min-h-screen bg-neutral-100 overflow-hidden" />}>
      <FaceRegistrationContent />
    </Suspense>
  );
}
