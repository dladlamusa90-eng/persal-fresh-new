"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import AppFooter from "@/app/components/AppFooter";
import {
  SOUTH_AFRICAN_BANK_NAMES,
  getBankAccountConstraintLabel,
  isValidBankAccountNumber,
  isSouthAfricanIdNumber,
  isSouthAfricanBankName,
  isSouthAfricanPhoneNumber,
  isValidPersalNumber,
  normalizeAccountNumber,
  normalizeIdNumber,
  normalizePersalNumber,
  normalizePhoneNumber,
} from "@/lib/validators/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const formElement = e.currentTarget as HTMLFormElement;
    const formData = new FormData(formElement);

    const name = String(formData.get("fullName") || "").trim();
    const phone = normalizePhoneNumber(String(formData.get("phone") || "").trim());
    const persal = normalizePersalNumber(String(formData.get("persalNumber") || "").trim());
    const id = normalizeIdNumber(String(formData.get("idNumber") || "").trim());
    const bank = String(formData.get("bankName") || "").trim();
    const account = normalizeAccountNumber(String(formData.get("accountNumber") || "").trim());
    const emailVal = String(formData.get("email") || "").trim();
    const passwordVal = String(formData.get("password") || "");
    const confirmVal = String(formData.get("confirmPassword") || "");
    const agree = formData.get("agree") === "on";
    if (!name || !phone || !persal || !id || !bank || !account || !emailVal || !passwordVal || !confirmVal || !agree) {
      setError("All fields are required, including terms consent.");
      return;
    }
    if (!isSouthAfricanPhoneNumber(phone)) {
      setError("Please enter a valid South African phone number (e.g. 0821234567 or +27821234567).");
      return;
    }
    if (!isValidPersalNumber(persal)) {
      setError("Persal Number must be exactly 8 digits.");
      return;
    }
    if (!isSouthAfricanIdNumber(id)) {
      setError("Please enter a valid South African ID Number.");
      return;
    }
    if (!isSouthAfricanBankName(bank)) {
      setError("Please select a valid South African bank.");
      return;
    }
    if (!isValidBankAccountNumber(bank, account)) {
      setError(`Account Number for ${bank} must be ${getBankAccountConstraintLabel(bank)}.`);
      return;
    }
    if (passwordVal !== confirmVal) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    // Send signup request to API
    fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: name,
        email: emailVal,
        persalNumber: persal,
        password: passwordVal,
        phone,
        idNumber: id,
        bankName: bank,
        accountNumber: account
      })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Signup failed");
        } else {
          router.push("/dashboard");
        }
      })
      .catch(() => setError("Signup failed. Please try again."))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <>
    <section className="relative min-h-screen flex items-center justify-center bg-neutral-100 px-4 md:px-0 py-8 overflow-hidden">
      <div className="relative z-10 w-full flex items-center justify-center">
        <form onSubmit={handleSignup} className="w-full max-w-md bg-white rounded-2xl p-6 md:p-8 shadow flex flex-col gap-4 md:gap-6">
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-center">Sign Up</h2>
          <label className="font-medium text-sm mb-1">Full Name<span className="text-red-600">*</span></label>
          <input name="fullName" type="text" placeholder="Full Name" className="border rounded p-2 md:p-3 w-full text-sm md:text-base" />
          <label className="font-medium text-sm mb-1">Phone Number<span className="text-red-600">*</span></label>
          <input name="phone" type="tel" placeholder="Phone Number (e.g. 0821234567 or +27821234567)" className="border rounded p-2 md:p-3 w-full text-sm md:text-base" />
          <label className="font-medium text-sm mb-1">Persal Number<span className="text-red-600">*</span></label>
          <input name="persalNumber" type="text" placeholder="Persal Number" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" className="border rounded p-2 md:p-3 w-full text-sm md:text-base" />
          <label className="font-medium text-sm mb-1">ID Number<span className="text-red-600">*</span></label>
          <input name="idNumber" type="text" placeholder="ID Number" inputMode="numeric" maxLength={13} pattern="[0-9]{13}" className="border rounded p-2 md:p-3 w-full text-sm md:text-base" />
          <label className="font-medium text-sm mb-1">Bank Name<span className="text-red-600">*</span></label>
          <div className="relative w-full">
            <select name="bankName" defaultValue="" className="border rounded p-2 md:p-3 pr-10 w-full text-sm md:text-base bg-white appearance-none">
              <option value="" disabled>
                Select Bank Name
              </option>
              {SOUTH_AFRICAN_BANK_NAMES.map((bankName) => (
                <option key={bankName} value={bankName}>
                  {bankName}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
          <label className="font-medium text-sm mb-1">Account Number<span className="text-red-600">*</span></label>
          <input name="accountNumber" type="text" placeholder="Account Number" inputMode="numeric" className="border rounded p-2 md:p-3 w-full text-sm md:text-base" />
          <label className="font-medium text-sm mb-1">Email<span className="text-red-600">*</span></label>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border rounded p-2 md:p-3 w-full text-sm md:text-base"
          />
          <label className="font-medium text-sm mb-1">Password<span className="text-red-600">*</span></label>
          <div className="relative w-full">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border rounded p-2 md:p-3 pr-12 w-full text-sm md:text-base"
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
          <label className="font-medium text-sm mb-1">Confirm Password<span className="text-red-600">*</span></label>
          <div className="relative w-full">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="border rounded p-2 md:p-3 pr-12 w-full text-sm md:text-base"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input name="agree" type="checkbox" />
            <span>
              I agree to the <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link> and <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link><span className="text-red-600">*</span>
            </span>
          </label>
          {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing Up..." : "Sign Up"}
          </button>
          <div className="text-center text-sm text-gray-500">Already have an account? <a href="/auth/login" className="text-blue-600 hover:underline">Sign In</a></div>
        </form>
      </div>
    </section>
    <AppFooter />
    </>
  );
}
