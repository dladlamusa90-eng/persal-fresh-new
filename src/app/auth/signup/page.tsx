"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import AppFooter from "@/app/components/AppFooter";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [persalNumber, setPersalNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [faceStep, setFaceStep] = useState<"idle" | "camera" | "captured">("idle");
  const [registrationFacePhoto, setRegistrationFacePhoto] = useState<string | null>(null);
  const [showRequirementsPopup, setShowRequirementsPopup] = useState(searchParams.get("from") === "login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
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
    if (faceStep !== "camera" || !videoRef.current || !streamRef.current) {
      return;
    }

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!firstName.trim() || !surname.trim() || !idNumber.trim() || !persalNumber.trim() || !phone.trim() || !email.trim() || !password.trim() || !address.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    const sanitizedId = idNumber.replace(/\D/g, "");
    if (sanitizedId.length !== 13) {
      setError("Please enter a valid 13-digit South African ID number.");
      return;
    }

    const normalizedPersal = persalNumber.replace(/\D/g, "");
    if (normalizedPersal.length !== 8) {
      setError("Please enter a valid 8-digit Persal Number.");
      return;
    }

    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    if (!/^(?:\+27|0)[1-9][0-9]{8}$/.test(normalizedPhone)) {
      setError("Please enter a valid South African cellphone number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!registrationFacePhoto) {
      setError("Face registration is required. Please capture your face photo before submitting.");
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
          fullName: `${firstName.trim()} ${surname.trim()}`.trim(),
          email: email.trim().toLowerCase(),
          password,
          idNumber: sanitizedId,
          persalNumber: normalizedPersal,
          phone: normalizedPhone,
          address: address.trim(),
          registrationFacePhoto,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Signup failed. Please try again.");
        return;
      }

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
          <div className="w-full max-w-7xl mx-auto">
        <form onSubmit={handleSignup} className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl text-gray-800 font-medium mb-7">Submit Application</h1>

          <div className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="first-name" className="text-gray-700 text-lg md:text-xl">First name</label>
              <input
                id="first-name"
                name="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="surname" className="text-gray-700 text-lg md:text-xl">Surname</label>
              <input
                id="surname"
                name="surname"
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Surname"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="id-number" className="text-gray-700 text-lg md:text-xl">ID Number</label>
              <input
                id="id-number"
                name="idNumber"
                type="text"
                inputMode="numeric"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))}
                placeholder="ID Number"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="persal-number" className="text-gray-700 text-lg md:text-xl">Persal Number</label>
              <input
                id="persal-number"
                name="persalNumber"
                type="text"
                inputMode="numeric"
                value={persalNumber}
                onChange={(e) => setPersalNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="8-digit Persal Number"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="cellphone" className="text-gray-700 text-lg md:text-xl">Cellphone</label>
              <input
                id="cellphone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0821234567"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="email" className="text-gray-700 text-lg md:text-xl">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="password" className="text-gray-700 text-lg md:text-xl">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <label htmlFor="address" className="text-gray-700 text-lg md:text-xl">Current Address</label>
              <input
                id="address"
                name="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 12 Maple Street, Johannesburg"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

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
                    onClick={startFaceCamera}
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
                        onClick={retakeFace}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="text-gray-700 text-base md:text-lg">
              Already applied? <Link href="/auth/login" className="text-teal-600 hover:underline">Log in</Link>
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-7 py-2.5 text-lg md:text-xl min-w-[200px] md:min-w-[230px] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>

          {error && <div className="mt-5 text-sm font-medium text-red-600">{error}</div>}
        </form>
          </div>
        </div>
      </div>

      {showRequirementsPopup && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Application requirements">
          <div className="w-full max-w-xl rounded-2xl bg-[#efefef] p-5 md:p-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <AlertCircle className="text-teal-500" size={48} strokeWidth={1.5} />
            </div>

            <h2 className="text-xl md:text-2xl text-gray-700 text-center mb-5">What you&apos;ll need for your application:</h2>

            <ul className="space-y-3 text-gray-700 text-base md:text-lg">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-lime-500 mt-0.5 shrink-0" size={18} />
                <span>South African ID number</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-lime-500 mt-0.5 shrink-0" size={18} />
                <span>A Persal Number</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-lime-500 mt-0.5 shrink-0" size={18} />
                <span>Personal email address</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-lime-500 mt-0.5 shrink-0" size={18} />
                <span>Most recent proof of income</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-lime-500 mt-0.5 shrink-0" size={18} />
                <span>Salary paid into a Capitec, Absa, FNB, Nedbank, Standard Bank or Tyme Bank account</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => setShowRequirementsPopup(false)}
              className="mt-6 w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-lg md:text-xl font-semibold py-2.5 transition"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </section>
    <AppFooter />
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<section className="relative min-h-screen bg-neutral-100 overflow-hidden" />}>
      <SignupPageContent />
    </Suspense>
  );
}
