"use client";
import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { calculateLoanCharges } from "@/lib/loanPolicy";
import { SOUTH_AFRICAN_BANK_NAMES } from "@/lib/validators/auth";

const SA_PHONE_PATTERN = /^(\+27|0)(6|7|8)[0-9]{8}$/;

function GuestApplyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialLoan = Math.max(100, Math.min(5000, Number(searchParams.get("loan")) || 1500));
  const rawDays = Number(searchParams.get("days")) || 30;
  // Snap to 30/60/90
  const initialTermDays = rawDays >= 75 ? 90 : rawDays >= 45 ? 60 : 30;

  const [amount] = useState(initialLoan);
  const [termDays] = useState(initialTermDays);

  // Personal details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [persalNumber, setPersalNumber] = useState("");

  // Income
  const [grossSalary, setGrossSalary] = useState(0);
  const [disposableIncome, setDisposableIncome] = useState(0);

  // Banking
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("CHEQUE");
  const [branchCode, setBranchCode] = useState("");

  // Mandate
  const [debitMandateAccepted, setDebitMandateAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const repayDate = new Date();
  repayDate.setDate(repayDate.getDate() + termDays);
  const repayDateLabel = repayDate.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const { totalCost, totalRepayable } = calculateLoanCharges(amount, termDays);

  function validatePhone(v: string) {
    return SA_PHONE_PATTERN.test(v.replace(/\s/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (!validatePhone(phone)) { setError("Please enter a valid South African phone number (e.g. 0821234567)."); return; }
    if (!idNumber.trim()) { setError("Please enter your South African ID number."); return; }
    if (!persalNumber.trim()) { setError("Please enter your Persal number."); return; }
    if (grossSalary <= 0) { setError("Please enter your gross monthly salary."); return; }
    if (disposableIncome <= 0 || disposableIncome > grossSalary) { setError("Please enter a valid disposable income amount."); return; }
    if (!bankName) { setError("Please select your bank."); return; }
    if (!accountNumber.trim()) { setError("Please enter your account number."); return; }
    if (!branchCode.trim()) { setError("Please enter your branch code."); return; }
    if (!debitMandateAccepted) { setError("You must accept the debit mandate to apply."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/guest/loan-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          idNumber: idNumber.trim(),
          persalNumber: persalNumber.trim(),
          grossSalary,
          disposableIncome,
          amount,
          termDays,
          bankName,
          accountNumber: accountNumber.trim(),
          accountType,
          branchCode: branchCode.trim(),
          debitMandateAccepted,
        }),
      });

      if (res.ok) {
        const body = (await res.json()) as { applicationId?: string; isNewUser?: boolean };
        router.push(`/apply/submitted?ref=${body.applicationId ?? ""}&newUser=${body.isNewUser ? "1" : "0"}`);
        return;
      }

      const body = (await res.json()) as { error?: string };
      setError(body.error ?? "Failed to submit application. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Persal" className="h-12 object-contain" />
          </a>
          <nav className="flex gap-3 items-center">
            <Link href="/auth/login" className="text-persal-dark font-medium px-4 py-2 rounded hover:bg-teal-50 transition text-sm">
              Sign In
            </Link>
            <Link href="/auth/signup?from=apply" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition text-sm">
              SignUp
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Loan Summary */}
        <div className="bg-persal-dark text-white rounded-2xl p-6 mb-8 shadow-lg">
          <h1 className="text-xl font-bold mb-1">Your Loan Application</h1>
          <p className="text-teal-200 text-sm mb-5">No account needed — just fill in your details below.</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-white">R{amount.toLocaleString()}</div>
              <div className="text-teal-300 text-xs mt-1">Loan Amount</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{termDays}</div>
              <div className="text-teal-300 text-xs mt-1">Days</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-300">R{totalRepayable.toFixed(2)}</div>
              <div className="text-teal-300 text-xs mt-1">Total Repayable</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-sm text-teal-200">
            <span>Interest &amp; Fees: <span className="text-white font-semibold">R{totalCost.toFixed(2)}</span></span>
            <span>Repay by: <span className="text-white font-semibold">{repayDateLabel}</span></span>
          </div>
        </div>

        {/* Optional SignUp banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 mb-8 flex items-start gap-3">
          <svg className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <p className="text-orange-800 font-semibold text-sm">Want more benefits?</p>
            <p className="text-orange-700 text-sm mt-0.5">
              <Link href="/auth/signup?from=apply" className="underline font-medium">Create an account</Link> to earn points on repayments, join a stokvel, and track all your loans in one place.
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Personal Details */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-base font-semibold text-persal-dark mb-4">Personal Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="As it appears on your ID"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1" htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1" htmlFor="phone">SA Cell Number</label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0821234567"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1" htmlFor="idNumber">SA ID Number</label>
                  <input
                    id="idNumber"
                    type="text"
                    inputMode="numeric"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    placeholder="13-digit SA ID"
                    maxLength={13}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1" htmlFor="persalNumber">Persal Number</label>
                  <input
                    id="persalNumber"
                    type="text"
                    inputMode="numeric"
                    value={persalNumber}
                    onChange={e => setPersalNumber(e.target.value)}
                    placeholder="8-digit Persal"
                    maxLength={8}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Income */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-base font-semibold text-persal-dark mb-4">Income Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1" htmlFor="grossSalary">Gross Monthly Salary (R)</label>
                <input
                  id="grossSalary"
                  type="number"
                  min={0}
                  value={grossSalary || ""}
                  onChange={e => setGrossSalary(Number(e.target.value))}
                  placeholder="e.g. 12000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1" htmlFor="disposableIncome">
                  Disposable Income (R)
                  <span className="ml-1 text-gray-400 font-normal text-xs">(after expenses)</span>
                </label>
                <input
                  id="disposableIncome"
                  type="number"
                  min={0}
                  value={disposableIncome || ""}
                  onChange={e => setDisposableIncome(Number(e.target.value))}
                  placeholder="e.g. 4000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                  required
                />
              </div>
            </div>
          </div>

          {/* Banking */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-base font-semibold text-persal-dark mb-4">Banking Details</h2>
            <p className="text-xs text-gray-500 mb-4">Loan will be disbursed to this account. Repayments deducted via Persal payroll.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1" htmlFor="bankName">Bank</label>
                <select
                  id="bankName"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue bg-white"
                  required
                >
                  <option value="">Select your bank</option>
                  {SOUTH_AFRICAN_BANK_NAMES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1" htmlFor="accountNumber">Account Number</label>
                  <input
                    id="accountNumber"
                    type="text"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="Bank account number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1" htmlFor="accountType">Account Type</label>
                  <select
                    id="accountType"
                    value={accountType}
                    onChange={e => setAccountType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue bg-white"
                  >
                    <option value="CHEQUE">Cheque / Current</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="TRANSMISSION">Transmission</option>
                  </select>
                </div>
              </div>
              <div className="md:w-1/2">
                <label className="block text-gray-700 text-sm mb-1" htmlFor="branchCode">Branch Code</label>
                <input
                  id="branchCode"
                  type="text"
                  inputMode="numeric"
                  value={branchCode}
                  onChange={e => setBranchCode(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                  required
                />
              </div>
            </div>
          </div>

          {/* Debit Mandate */}
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-base font-semibold text-persal-dark mb-3">Debit Mandate</h2>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              By accepting, you authorise Persal Loans to deduct repayments from your salary via the Persal payroll system. The deduction of <strong>R{totalRepayable.toFixed(2)}</strong> will be made on or around <strong>{repayDateLabel}</strong>. This mandate is governed by the National Credit Act and may be cancelled with written notice.
            </p>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-persal-blue"
                checked={debitMandateAccepted}
                onChange={e => setDebitMandateAccepted(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                I authorise Persal Loans to deduct my loan repayment from my salary as described above.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base shadow-lg transition"
          >
            {submitting ? "Submitting…" : "Submit Application"}
          </button>

          <p className="text-center text-xs text-gray-500 pb-6">
            By submitting, you agree to our{" "}
            <Link href="/terms" className="underline text-persal-blue">Terms &amp; Conditions</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline text-persal-blue">Privacy Policy</Link>.
          </p>
        </form>
      </main>
    </div>
  );
}

export default function GuestApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <GuestApplyContent />
    </Suspense>
  );
}
