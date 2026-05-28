"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import AppFooter from "@/app/components/AppFooter";

const SIGNUP_DRAFT_KEY = "signup-application-draft-v1";

function SignupPageContent() {
  const searchParams = useSearchParams();

  // Pre-fill from loan application draft if user came from the apply form
  const loanDraft = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem("guestLoanApplyDraft") ?? "null"); } catch { return null; }
  })();
  const draftFullName: string = loanDraft?.fullName ?? "";
  const draftNameParts = draftFullName.trim().split(/\s+/);
  const draftFirstName = draftNameParts[0] ?? "";
  const draftSurname = draftNameParts.slice(1).join(" ") ?? "";

  const [firstName, setFirstName] = useState(draftFirstName);
  const [surname, setSurname] = useState(draftSurname);
  const [idNumber, setIdNumber] = useState(loanDraft?.idNumber ?? "");
  const [persalNumber, setPersalNumber] = useState(loanDraft?.persalNumber ?? "");
  const [phone, setPhone] = useState(loanDraft?.phone ?? "");
  const [email, setEmail] = useState(loanDraft?.email ?? "");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [showRequirementsPopup, setShowRequirementsPopup] = useState(searchParams.get("from") === "login");
  const [error, setError] = useState("");
  const router = useRouter();

  function normalizeSouthAfricanPhoneInput(value: string) {
    const cleaned = value.replace(/[^\d+]/g, "");
    const withSingleLeadingPlus = cleaned.startsWith("+")
      ? `+${cleaned.slice(1).replace(/\+/g, "")}`
      : cleaned.replace(/\+/g, "");

    if (withSingleLeadingPlus.startsWith("+")) {
      return withSingleLeadingPlus.slice(0, 12);
    }

    return withSingleLeadingPlus.slice(0, 10);
  }
  async function handleNext(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName.trim() || !surname.trim() || !idNumber.trim() || !persalNumber.trim() || !phone.trim() || !email.trim() || !password.trim() || !address.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    const sanitizedId = idNumber.replace(/\D/g, "");
    if (sanitizedId.length !== 13) {
      setError("Please enter a valid 13-digit South African ID number.");
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

    try {
      // Directly call signup API here (no face step, no persal)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: `${firstName.trim()} ${surname.trim()}`,
          idNumber: sanitizedId,
          persalNumber: persalNumber.trim(),
          phone: normalizedPhone,
          email: email.trim().toLowerCase(),
          password,
          address: address.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to sign up. Please try again.");
        return;
      }
      setError("");
      // If coming from guest loan application, go to statement page
      if (searchParams.get("from") === "apply") {
        router.push("/apply/statement");
      } else {
        router.push("/auth/login?from=signup");
      }
    } catch {
      setError("Unable to continue. Please try again.");
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
              <a href="/auth/login" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">LogIn</a>
              <span className="px-4 py-2 rounded bg-gray-200 text-gray-500 font-semibold cursor-not-allowed select-none">Sign Up</span>
            </nav>
          </div>
        </header>

        <div className="w-full px-4 md:px-8 pt-4 pb-10">
          <div className="w-full max-w-7xl mx-auto">
        <form onSubmit={handleNext} className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl text-gray-800 font-medium mb-7">Sign Up</h1>

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
                inputMode="tel"
                pattern="^(?:\+27|0)[1-9][0-9]{8}$"
                title="Enter a valid South African cellphone number, e.g. 0821234567 or +27821234567"
                value={phone}
                onChange={(e) => setPhone(normalizeSouthAfricanPhoneInput(e.target.value))}
                placeholder="e.g. 0821234567 or +27821234567"
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

          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="text-gray-700 text-base md:text-lg">
              Already have an account? <Link href="/auth/login" className="text-teal-600 hover:underline">LogIn</Link>
            </p>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-7 py-2.5 text-lg md:text-xl min-w-[200px] md:min-w-[230px] transition"
            >
              Next
            </button>
          </div>

          {error && <div className="mt-5 text-sm font-medium text-red-600">{error}</div>}
        </form>
          </div>
        </div>
      </div>

      {showRequirementsPopup && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Signup requirements">
          <div className="w-full max-w-xl rounded-2xl bg-[#efefef] p-5 md:p-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <AlertCircle className="text-teal-500" size={48} strokeWidth={1.5} />
            </div>

            <h2 className="text-xl md:text-2xl text-gray-700 text-center mb-5">What you&apos;ll need for signup:</h2>

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
                <span>South African Cell Number</span>
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
