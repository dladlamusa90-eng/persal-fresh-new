"use client";

import { FormEvent, useState } from "react";
import { ChevronLeft } from "lucide-react";
import AppFooter from "@/app/components/AppFooter";

export default function ResetPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function requestOtp(e: FormEvent) {
    e.preventDefault();

    const value = identifier.trim();
    if (!value) {
      setError("Please enter your email or SA ID number.");
      return;
    }

    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "request-otp",
          identifier: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not send reset OTP.");
        return;
      }

      if (data.maskedPhone) {
        setMaskedPhone(String(data.maskedPhone));
        setMessage("A reset OTP has been sent to your registered cellphone number.");
        setStep("confirm");
        return;
      }

      setMessage("If the account exists, a reset OTP has been sent.");
    } catch {
      setError("Could not send reset OTP right now. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmReset(e: FormEvent) {
    e.preventDefault();

    if (!/^\d{4}$/.test(otpCode.trim())) {
      setError("Please enter the 4-digit OTP.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "confirm-reset",
          identifier: identifier.trim(),
          otpCode: otpCode.trim(),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not reset password.");
        return;
      }

      setMessage("Password reset successful. You can now log in.");
      setStep("request");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setMaskedPhone("");
    } catch {
      setError("Could not reset password right now. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <section className="relative min-h-screen bg-neutral-100 overflow-hidden">
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="w-full flex items-center justify-between py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
            <div className="flex w-full items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Persal Logo"
                  className="w-[90px] h-[90px] object-contain -my-4"
                  style={{ width: "90px", height: "90px" }}
                />
              </a>
              <nav className="flex gap-4 items-center">
                <a
                  href="/auth/login"
                  className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition"
                >
                  Login
                </a>
                <a
                  href="/auth/signup?from=login"
                  className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition"
                >
                  Register
                </a>
              </nav>
            </div>
          </header>

          <div className="max-w-5xl mx-auto w-full px-4 md:px-6 mt-6 pb-8 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
            <div className="mt-2">
              <h1 className="text-2xl md:text-3xl text-gray-800 font-medium">Reset your password</h1>
              <p className="text-base md:text-lg text-gray-600 mt-2">
                Enter your email or SA ID number to receive a reset OTP.
              </p>

              {step === "confirm" && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setError("");
                    setMessage("");
                  }}
                  className="mt-6 inline-flex items-center gap-1 text-sky-600 hover:underline text-sm"
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
              )}

              {step === "request" ? (
                <form onSubmit={requestOtp} className="mt-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-4">
                    <label htmlFor="identifier" className="text-gray-700 text-lg">
                      Email or SA ID number
                    </label>
                    <input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="name@email.com or 13-digit ID"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-8 py-3 text-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isBusy ? "Sending..." : "Send reset OTP"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={confirmReset} className="mt-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-4">
                    <label className="text-gray-700 text-lg">Cellphone number</label>
                    <input
                      type="text"
                      value={maskedPhone}
                      readOnly
                      className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-4">
                    <label htmlFor="otpCode" className="text-gray-700 text-lg">
                      Reset OTP
                    </label>
                    <input
                      id="otpCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-4">
                    <label htmlFor="newPassword" className="text-gray-700 text-lg">
                      New password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] items-center gap-4">
                    <label htmlFor="confirmPassword" className="text-gray-700 text-lg">
                      Confirm new password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-8 py-3 text-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isBusy ? "Resetting..." : "Reset password"}
                    </button>
                  </div>
                </form>
              )}

              {message && <p className="mt-6 text-sm font-medium text-green-700">{message}</p>}
              {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
            </div>
          </div>
        </div>
      </section>
      <AppFooter />
    </>
  );
}
