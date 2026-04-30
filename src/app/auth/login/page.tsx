"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import AppFooter from "@/app/components/AppFooter";

type LoginTab = "id" | "email";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>("id");
  const [idNumber, setIdNumber] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpMaskedPhone, setOtpMaskedPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();

    const sanitized = idNumber.replace(/\D/g, "");
    if (sanitized.length !== 13) {
      setOtpInfo("Please enter a valid 13-digit SA ID number.");
      return;
    }

    setOtpInfo("");
    setError("");
    setIsRequestingOtp(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "request-otp",
          idNumber: sanitized,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setOtpInfo(data.error || "We could not find an account for that ID number.");
        setShowOtpStep(false);
        setOtpMaskedPhone("");
        return;
      }

      setOtpMaskedPhone(String(data.maskedPhone ?? ""));
      setOtpCode("");
      setShowOtpStep(true);
    } catch {
      setOtpInfo("We could not send your OTP right now. Please try again.");
      setShowOtpStep(false);
      setOtpMaskedPhone("");
    } finally {
      setIsRequestingOtp(false);
    }
  }

  function handleOtpLogin(e: React.FormEvent) {
    e.preventDefault();
    const sanitized = idNumber.replace(/\D/g, "");
    const otp = otpCode.replace(/\D/g, "").slice(0, 4);

    if (!/^\d{13}$/.test(sanitized)) {
      setOtpInfo("Please enter a valid 13-digit SA ID number.");
      return;
    }

    if (!/^\d{4}$/.test(otp)) {
      setOtpInfo("Please enter the 4-digit OTP.");
      return;
    }

    setOtpInfo("");

    fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "verify-otp",
        idNumber: sanitized,
        otpCode: otp,
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          setOtpInfo(data.error || "OTP verification failed.");
          return;
        }

        if (data.user?.role === "ADMIN") {
          router.push("/admin");
          return;
        }

        router.push("/dashboard");
      })
      .catch(() => {
        setOtpInfo("OTP verification failed. Please try again.");
      });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid credentials");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;

      if (role === "ADMIN") {
        router.push("/admin");
        return;
      }

      router.push("/dashboard");
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
              <span className="px-4 py-2 rounded bg-gray-100 text-gray-400 font-medium cursor-not-allowed select-none">Login</span>
              <a href="/auth/signup?from=login" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">Apply</a>
            </nav>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full px-4 md:px-6 mt-6 pb-8 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
          {!showOtpStep && (
            <div className="bg-gray-200 rounded-full p-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("id");
                setError("");
                setShowOtpStep(false);
              }}
              className={`w-1/2 rounded-full py-2.5 text-sm md:text-base font-medium transition ${activeTab === "id" ? "bg-white text-teal-600 shadow" : "text-gray-700 hover:text-gray-900"}`}
            >
              ID number login
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("email");
                setOtpInfo("");
                setShowOtpStep(false);
              }}
              className={`w-1/2 rounded-full py-2.5 text-sm md:text-base font-medium transition ${activeTab === "email" ? "bg-white text-teal-600 shadow" : "text-gray-700 hover:text-gray-900"}`}
            >
              Email login
            </button>
            </div>
          )}

          <div className="mt-10">
            {showOtpStep ? (
              <form onSubmit={handleOtpLogin} className="space-y-6 md:space-y-7">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpStep(false);
                    setOtpInfo("");
                    setOtpMaskedPhone("");
                  }}
                  className="inline-flex items-center gap-1 text-teal-600 hover:underline text-sm"
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>

                <h1 className="text-2xl md:text-[42px] text-gray-800 font-medium leading-tight">Log in with OTP</h1>
                <p className="text-base md:text-[18px] text-gray-600 max-w-[920px] leading-relaxed">
                  We&apos;ve sent an OTP via SMS to the cellphone number registered to this account. Please enter the OTP to log in.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-4 md:gap-9 pt-2">
                  <label className="text-gray-700 text-base md:text-lg">Cellphone number</label>
                  <input
                    type="text"
                    value={otpMaskedPhone}
                    readOnly
                    className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-start gap-4 md:gap-9">
                  <label htmlFor="otp-code" className="text-gray-700 text-base md:text-lg pt-2.5">Please enter the 4 digit OTP</label>
                  <div className="w-full">
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="OTP"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const sanitized = idNumber.replace(/\D/g, "");
                        if (!/^\d{13}$/.test(sanitized)) {
                          setOtpInfo("Please enter a valid 13-digit SA ID number.");
                          return;
                        }

                        const response = await fetch("/api/auth/login", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            action: "request-otp",
                            idNumber: sanitized,
                          }),
                        });

                        const data = await response.json();
                        if (!response.ok) {
                          setOtpInfo(data.error || "We could not send a new OTP.");
                          return;
                        }

                        setOtpMaskedPhone(String(data.maskedPhone ?? otpMaskedPhone));
                        setOtpInfo("A new OTP has been sent.");
                      }}
                      className="mt-4 text-teal-600 hover:underline text-base"
                    >
                      Request new OTP
                    </button>
                  </div>
                </div>

                {otpInfo && <div className="text-sm font-medium text-teal-700">{otpInfo}</div>}

                <div className="flex justify-end pt-2">
                  <div className="w-full md:w-[320px]">
                    <p className="text-base text-right text-gray-700 mb-4">
                      Trouble logging in? <button type="button" onClick={() => { setShowOtpStep(false); setActiveTab("email"); }} className="text-teal-600 hover:underline">Log in with your email</button>
                    </p>
                    <button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-7 py-2.5 text-lg transition"
                    >
                      Log in
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <>
            <h1 className="text-2xl md:text-3xl text-gray-800 font-medium">Welcome back, please log in</h1>

            {activeTab === "id" ? (
              <form onSubmit={handleOtpRequest} className="mt-7 space-y-8">
                <p className="text-base md:text-lg text-gray-600">Enter your SA ID number and we&apos;ll send you a One Time Pin (OTP)</p>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-4">
                  <label htmlFor="id-number" className="text-gray-700 text-lg md:text-xl">SA ID number</label>
                  <input
                    id="id-number"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="ID number"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>
                {otpInfo && <p className="text-sm font-medium text-teal-700">{otpInfo}</p>}
                <div className="flex items-center justify-between gap-4 pt-6">
                  <p className="text-gray-700 text-base md:text-lg">Don&apos;t have an account? <a href="/auth/signup?from=login" className="text-teal-600 hover:underline">Apply</a></p>
                  <button type="submit" disabled={isRequestingOtp} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-7 py-2.5 text-lg md:text-xl min-w-[200px] md:min-w-[230px] transition disabled:opacity-60 disabled:cursor-not-allowed">
                    {isRequestingOtp ? "Checking..." : "Get OTP"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="mt-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] items-center gap-4">
                  <label htmlFor="email" className="text-gray-700 text-lg">Email address OR ID number</label>
                  <input
                    id="email"
                    type="text"
                    placeholder="Email address or ID number"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] items-end gap-4">
                  <label htmlFor="password" className="text-gray-700 text-lg">Password</label>
                  <div className="w-full">
                    <div className="text-right mb-2">
                      <a href="/auth/reset-password" className="text-teal-600 hover:underline text-sm md:text-base">Forgot your password?</a>
                    </div>
                    <div className="relative w-full">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}

                <div className="flex justify-end">
                  <div className="w-full md:w-[360px]">
                    <p className="text-base text-right text-gray-700 mb-4">
                        Trouble logging in?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("id");
                            setError("");
                            setOtpInfo("");
                            setShowOtpStep(false);
                          }}
                          className="text-teal-600 hover:underline"
                        >
                          Log in with your cellphone
                        </button>
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-8 py-3 text-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Logging in..." : "Log in"}
                    </button>
                  </div>
                </div>
              </form>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
    <AppFooter />
    </>
  );
}
