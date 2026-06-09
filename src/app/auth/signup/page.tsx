"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { signIn } from "next-auth/react";
import AppFooter from "@/app/components/AppFooter";
import FaceIdGate from "@/app/components/FaceIdGate";
import { SOUTH_AFRICAN_BANK_NAMES } from "@/lib/validators/auth";

const SIGNUP_STEP_KEY = "signup_wizard_step";
const SIGNUP_STITCH_KEY = "signup_stitch_done";

const accountTypeOptions = [
  { value: "CHEQUE", label: "Cheque account" },
  { value: "SAVINGS", label: "Savings account" },
  { value: "TRANSMISSION", label: "Transmission account" },
] as const;
type AccountType = (typeof accountTypeOptions)[number]["value"];

// 3-step flow: Personal Info → Identity Verification → Bank Details & Verification
const stepLabels = ["Personal Info", "Identity Verification", "Bank & Debit"];

const STITCH_ERROR_MESSAGES: Record<string, string> = {
  session_expired: "Verification session expired. Please try again.",
  invalid_state: "Security check failed. Please try again.",
  token_exchange_failed: "Could not connect to Stitch. Please try again.",
  access_denied: "You cancelled bank verification.",
};

function SignupPageContent() {
  const searchParams = useSearchParams();
  const fromApply = searchParams.get("from") === "apply";
  const loginHref = fromApply ? "/auth/login?callbackUrl=/apply/statement" : "/auth/login";

  // Pre-fill from loan application draft if user came from the apply form
  const loanDraft = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(sessionStorage.getItem("guestLoanApplyDraft") ?? "null"); } catch { return null; }
  })();
  const draftFullName: string = loanDraft?.fullName ?? "";
  const draftNameParts = draftFullName.trim().split(/\s+/);
  const draftFirstName = draftNameParts[0] ?? "";
  const draftSurname = draftNameParts.slice(1).join(" ") ?? "";

  // Step 1: Personal info
  const [firstName, setFirstName] = useState(draftFirstName);
  const [surname, setSurname] = useState(draftSurname);
  const [idNumber, setIdNumber] = useState(loanDraft?.idNumber ?? "");
  const [persalNumber, setPersalNumber] = useState(loanDraft?.persalNumber ?? "");
  const [phone, setPhone] = useState(loanDraft?.phone ?? "");
  const [email, setEmail] = useState(loanDraft?.email ?? "");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");

  // Step 2: Bank details (pre-filled from loan application draft)
  const [bankName, setBankName] = useState<string>(loanDraft?.bankName || "Capitec");
  const [accountNumber, setAccountNumber] = useState<string>(loanDraft?.accountNumber || "");
  const [accountType, setAccountType] = useState<AccountType>(loanDraft?.accountType || "SAVINGS");
  const [branchCode, setBranchCode] = useState<string>(loanDraft?.branchCode || "");

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [stitchVerified, setStitchVerified] = useState(false);
  const [stitchError, setStitchError] = useState("");
  const [showRequirementsPopup, setShowRequirementsPopup] = useState(searchParams.get("from") === "login");
  const router = useRouter();

  // Restore wizard step after Didit / Stitch OAuth redirects
  useEffect(() => {
    const savedStep = sessionStorage.getItem(SIGNUP_STEP_KEY);
    const stitchVerifiedParam = searchParams.get("stitch_verified");
    const stitchErrorParam = searchParams.get("stitch_error");

    if (savedStep === "3") {
      setStep(3);
      if (stitchVerifiedParam === "true") {
        setStitchVerified(true);
        sessionStorage.setItem(SIGNUP_STITCH_KEY, "true");
      } else if (stitchErrorParam) {
        setStitchError(STITCH_ERROR_MESSAGES[stitchErrorParam] ?? "Bank verification failed. Please try again.");
      } else if (sessionStorage.getItem(SIGNUP_STITCH_KEY) === "true") {
        setStitchVerified(true);
      }
    } else if (savedStep === "2") {
      setStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Step 1: validate + create account + auto-login → step 2
  async function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
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
    setError("");
    setSubmitting(true);
    try {
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
        setError(data.detail || data.error || "Unable to sign up. Please try again.");
        return;
      }
      const loginResult = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!loginResult || loginResult.error) {
        router.push("/auth/login?from=signup");
        return;
      }
      sessionStorage.setItem(SIGNUP_STEP_KEY, "2");
      setStep(2);
    } catch {
      setError("Unable to continue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Debit mandate state
  const [debitMandateAccepted, setDebitMandateAccepted] = useState(false);

  // Step 2 complete: identity verified via Didit → step 3
  const handleIdentityVerified = useCallback(() => {
    sessionStorage.setItem(SIGNUP_STEP_KEY, "3");
    setStep(3);
  }, []);

  // Step 3: save bank details + submit loan (if fromApply) → login screen
  async function handleStep3Submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!accountNumber.trim()) { setError("Please enter your bank account number."); return; }
    if (!branchCode.trim()) { setError("Please enter your branch code."); return; }
    if (!debitMandateAccepted) { setError("Please accept the Debit Order Mandate to continue."); return; }
    setError("");
    setSubmitting(true);
    try {
      const patchRes = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, accountNumber: accountNumber.trim(), accountType, branchCode: branchCode.trim() }),
      });
      if (!patchRes.ok) {
        const d = await patchRes.json().catch(() => ({}));
        setError((d as any).error || "Could not save bank details. Please try again.");
        setSubmitting(false);
        return;
      }
      if (fromApply) {
        const draft = (() => { try { return JSON.parse(sessionStorage.getItem("guestLoanApplyDraft") ?? "null"); } catch { return null; } })();
        if (draft) {
          const loanRes = await fetch("/api/loans/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: draft.amount,
              termDays: draft.termDays,
              grossSalary: draft.grossSalary,
              disposableIncome: draft.disposableIncome,
              bankName,
              accountNumber: accountNumber.trim(),
              accountType,
              branchCode: branchCode.trim(),
              debitMandateAccepted: true,
              bankStatementDocument: draft.bankStatementDocument ?? null,
            }),
          });
          if (loanRes.ok) sessionStorage.removeItem("guestLoanApplyDraft");
        }
      }
      sessionStorage.removeItem(SIGNUP_STEP_KEY);
      sessionStorage.removeItem(SIGNUP_STITCH_KEY);
      router.push("/auth/login?signup=complete");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base md:text-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300";
  const labelCls = "text-gray-700 text-lg md:text-xl";
  const rowCls = "grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center";

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
              <a href={loginHref} className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">LogIn</a>
              <span className="px-4 py-2 rounded bg-gray-200 text-gray-500 font-semibold cursor-not-allowed select-none">Sign Up</span>
            </nav>
          </div>
        </header>

        <div className="w-full px-4 md:px-8 pt-4 pb-10">
          <div className="w-full max-w-7xl mx-auto">

            {/* Step progress bar */}
            <div className="w-full max-w-5xl mx-auto mb-6">
              <div className="flex items-start gap-1.5">
                {stepLabels.map((label, i) => {
                  const n = (i + 1) as 1 | 2 | 3;
                  const isDone = step > n;
                  const isActive = step === n;
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`h-1.5 w-full rounded-full transition-all ${isDone ? "bg-teal-500" : isActive ? "bg-orange-400" : "bg-gray-200"}`} />
                      <span className={`hidden md:block text-xs font-medium text-center ${isDone ? "text-teal-600" : isActive ? "text-orange-500" : "text-gray-400"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="md:hidden text-center text-sm font-medium text-gray-600 mt-2">Step {step} of 3: {stepLabels[step - 1]}</p>
            </div>

          {/* ── STEP 1: Personal Information ── */}
          {step === 1 && (
          <form onSubmit={handleStep1Submit} className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl text-gray-800 font-medium mb-7">Personal Information</h1>

            <div className="space-y-7">
              <div className={rowCls}>
                <label htmlFor="first-name" className={labelCls}>First name</label>
                <input id="first-name" name="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
              </div>

              <div className={rowCls}>
                <label htmlFor="surname" className={labelCls}>Surname</label>
                <input id="surname" name="surname" type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Surname" className={inputCls} />
              </div>

              <div className={rowCls}>
                <label htmlFor="id-number" className={labelCls}>ID Number</label>
                <input id="id-number" name="idNumber" type="text" inputMode="numeric" value={idNumber} onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))} placeholder="13-digit SA ID number" className={inputCls} />
              </div>

              <div className={rowCls}>
                <label htmlFor="persal-number" className={labelCls}>Persal Number</label>
                <input id="persal-number" name="persalNumber" type="text" inputMode="numeric" value={persalNumber} onChange={(e) => setPersalNumber(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="8-digit Persal Number" className={inputCls} />
              </div>

              <div className={rowCls}>
                <label htmlFor="cellphone" className={labelCls}>Cellphone</label>
                <input id="cellphone" name="phone" type="tel" inputMode="tel" pattern="^(?:\+27|0)[1-9][0-9]{8}$" title="Enter a valid South African cellphone number, e.g. 0821234567 or +27821234567" value={phone} onChange={(e) => setPhone(normalizeSouthAfricanPhoneInput(e.target.value))} placeholder="e.g. 0821234567 or +27821234567" className={inputCls} />
              </div>

              <div className={rowCls}>
                <label htmlFor="email" className={labelCls}>Email</label>
                <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputCls} />
              </div>

              <div className={rowCls}>
                <label htmlFor="password" className={labelCls}>Password</label>
                <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className={inputCls} />
              </div>

              <div className={rowCls}>
                <label htmlFor="address" className={labelCls}>Current Address</label>
                <input id="address" name="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Maple Street, Johannesburg" className={inputCls} />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="text-gray-700 text-base md:text-lg">
                Already have an account? <Link href={loginHref} className="text-teal-600 hover:underline">LogIn</Link>
              </p>
              <button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl px-7 py-2.5 text-lg md:text-xl min-w-[200px] md:min-w-[230px] transition">
                {submitting ? "Creating Account…" : "Next: Verify Identity"}
              </button>
            </div>
            {error && <div className="mt-5 text-sm font-medium text-red-600">{error}</div>}
          </form>
          )}

          {/* ── STEP 2: Identity Verification ── */}
          {step === 2 && (
          <div className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl text-gray-800 font-medium mb-2">Identity Verification</h1>
            <p className="mb-2 text-sm text-gray-600">
              Please verify your identity using your South African ID document. Make sure the document you present matches the ID number you entered:
            </p>
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-teal-50 border border-teal-200 px-4 py-2">
              <span className="text-xs text-teal-700 font-medium">Your ID:</span>
              <span className="text-sm font-bold text-teal-900 tracking-widest">{idNumber.replace(/\D/g, "")}</span>
            </div>
            <FaceIdGate onVerified={handleIdentityVerified} />
          </div>
          )}

          {/* ── STEP 3: Bank Details + Verification + Debit Mandate ── */}
          {step === 3 && (
          <form onSubmit={handleStep3Submit} className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-5 md:p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl text-gray-800 font-medium mb-2">Bank Details &amp; Verification</h1>
            <p className="mb-7 text-sm text-gray-600">Enter your salary bank account, optionally verify it with Stitch, and accept the debit order mandate.</p>

            {/* Bank Details */}
            <div className="space-y-6 mb-8">
              <div className={rowCls}>
                <label htmlFor="bank-name" className={labelCls}>Bank Name</label>
                <div className="relative">
                  <select id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} className={`${inputCls} appearance-none pr-10`}>
                    {SOUTH_AFRICAN_BANK_NAMES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              <div className={rowCls}>
                <label htmlFor="account-number" className={labelCls}>Account Number</label>
                <input id="account-number" type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} placeholder="Account number" className={inputCls} />
              </div>
              <div className={rowCls}>
                <label htmlFor="account-type" className={labelCls}>Account Type</label>
                <div className="relative">
                  <select id="account-type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className={`${inputCls} appearance-none pr-10`}>
                    {accountTypeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              <div className={rowCls}>
                <label htmlFor="branch-code" className={labelCls}>Branch Code</label>
                <input id="branch-code" type="text" inputMode="numeric" value={branchCode} onChange={(e) => setBranchCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit branch code" className={inputCls} />
              </div>
            </div>

            {/* Stitch Bank Verification */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Bank Verification</h2>
              {stitchVerified ? (
                <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
                    <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-teal-800">Bank account verified</p>
                    <p className="text-xs text-teal-700 mt-0.5">Your bank account was confirmed via Stitch.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Verify your bank account instantly</p>
                      <p className="text-xs text-gray-500 mt-0.5">Use Stitch to securely link and confirm your bank account.</p>
                    </div>
                    <a
                      href={`/api/stitch/link?returnTo=${encodeURIComponent("/auth/signup")}`}
                      onClick={() => sessionStorage.setItem(SIGNUP_STEP_KEY, "3")}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-persal-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-persal-dark"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      Verify with Stitch
                    </a>
                  </div>
                  {stitchError && <p className="mt-3 text-xs text-red-600">{stitchError}</p>}
                  <p className="mt-3 text-xs text-gray-400">Bank verification is optional but recommended.</p>
                </div>
              )}
            </div>

            {/* Debit Order Mandate */}
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Debit Order Mandate</h2>

              <div className="space-y-3 text-sm text-gray-600 leading-relaxed mb-5">
                <p>
                  By signing this mandate, you (<strong>the Account Holder</strong>) authorise <strong>Persal Loans (Pty) Ltd</strong> to
                  issue and deliver payment instructions to your bank for collection against your bank account on the due date of each
                  loan repayment, or any later date as agreed.
                </p>
                <p>
                  The amounts debited will be those due in terms of your approved loan agreement. Repayments will be collected monthly
                  via the <strong>Persal payroll deduction system</strong> and/or via debit order against your nominated bank account.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>This mandate is governed by the <strong>National Credit Act 34 of 2005</strong>.</li>
                  <li>You may cancel this mandate by giving <strong>written notice</strong> to Persal Loans at least <strong>7 business days</strong> before the next debit date, subject to your outstanding loan obligations.</li>
                  <li>You confirm that the bank account nominated is in your name and that you are authorised to transact on it.</li>
                  <li>This mandate <strong>only becomes active once your loan application is approved</strong> and a loan agreement is signed.</li>
                  <li>Insufficient funds may result in bank charges and late payment fees as stipulated in your loan agreement.</li>
                </ul>
                <p className="text-xs text-gray-500">
                  Persal Loans (Pty) Ltd is a registered credit provider under the National Credit Act. NCR Registration No. [NCR REG NO].
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={debitMandateAccepted} onChange={(e) => setDebitMandateAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                <span className="text-sm font-medium text-gray-700">
                  I have read and understood the Debit Order Mandate above. I authorise Persal Loans to deduct my loan repayments from my salary/bank account as described, once my loan is approved.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-4">
              <button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl px-7 py-2.5 text-lg md:text-xl min-w-[200px] transition">
                {submitting ? "Submitting…" : fromApply ? "Submit Loan Application" : "Complete Sign Up"}
              </button>
            </div>
            {error && <div className="mt-5 text-sm font-medium text-red-600">{error}</div>}
          </form>
          )}

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
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-lime-500 mt-0.5 shrink-0" size={18} />
                <span>Bank account details</span>
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
