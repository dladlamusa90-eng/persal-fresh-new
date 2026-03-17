"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import AppFooter from "@/app/components/AppFooter";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [showRequirementsPopup, setShowRequirementsPopup] = useState(searchParams.get("from") === "login");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !surname.trim() || !idNumber.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    const sanitizedId = idNumber.replace(/\D/g, "");
    if (sanitizedId.length !== 13) {
      setError("Please enter a valid 13-digit South African ID number.");
      return;
    }

    setError("");
    router.push("/auth/login");
  }

  return (
    <>
    <section className="relative min-h-screen bg-neutral-100 overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="w-full flex items-center justify-between py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
          <div className="flex w-full items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Persal Logo" className="w-[90px] h-[90px] object-contain -my-4" style={{ width: "90px", height: "90px" }} />
            </a>
            <nav className="flex gap-4 items-center">
              <a href="/auth/login" className="text-persal-dark font-medium px-4 py-2 rounded hover:bg-blue-50 transition">Login</a>
              <span className="px-4 py-2 rounded bg-gray-200 text-gray-500 font-semibold cursor-not-allowed select-none">Register</span>
            </nav>
          </div>
        </header>

        <div className="w-full px-4 md:px-8 pt-4 pb-10">
          <div className="w-full max-w-7xl mx-auto">
        <form onSubmit={handleSignup} className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl text-gray-800 font-medium mb-7">Register</h1>

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
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="text-gray-700 text-base md:text-lg">
              Already have an account? <Link href="/auth/login" className="text-sky-600 hover:underline">Log in</Link>
            </p>
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-7 py-2.5 text-lg md:text-xl min-w-[200px] md:min-w-[230px] transition"
            >
              Continue
            </button>
          </div>

          {error && <div className="mt-5 text-sm font-medium text-sky-700">{error}</div>}
        </form>
          </div>
        </div>
      </div>

      {showRequirementsPopup && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Application requirements">
          <div className="w-full max-w-xl rounded-2xl bg-[#efefef] p-5 md:p-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <AlertCircle className="text-sky-500" size={48} strokeWidth={1.5} />
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
