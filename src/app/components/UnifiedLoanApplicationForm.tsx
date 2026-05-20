"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { calculateLoanCharges, getMaxLoanForUser, calculateLogicalMaxLoan, FIRST_TIME_MAX_LOAN, RETURNING_MAX_LOAN, MIN_DISPOSABLE_INCOME_FOR_LOAN, MAX_LOAN_DISPOSABLE_INCOME_RATIO } from "@/lib/loanPolicy";
import { SOUTH_AFRICAN_BANK_NAMES, isSouthAfricanIdNumber } from "@/lib/validators/auth";
import { BANK_BRANCH_CODES } from "@/lib/bankBranchCodes";
// import { CAPITEC_BRANCHES } from "@/lib/capitecBranches";

type UploadedDocument = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type UnifiedLoanApplicationFormProps = {
  user?: {
    isLoggedIn: boolean;
    isReturningUser?: boolean;
    hasActiveLoan?: boolean;
    hasPendingLoan?: boolean;
    faceIdVerified?: boolean;
    applicationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
    phone?: string;
    idNumber?: string;
    persalNumber?: string;
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    branchCode?: string;
    // ...other user fields
  };
  initialDraft?: any;
  onAfterSubmit?: () => void;
};

const SA_PHONE_PATTERN = /^(\+27|0)(6|7|8)[0-9]{8}$/;
const MAX_BANK_STATEMENT_SIZE_BYTES = 2 * 1024 * 1024;

export default function UnifiedLoanApplicationForm({ user, initialDraft, onAfterSubmit }: UnifiedLoanApplicationFormProps) {
  // ...state declarations...

  // ...state declarations...


  // --- STATE DECLARATIONS ---
  const [amount, setAmount] = useState(() => {
    if (initialDraft?.amount) return initialDraft.amount;
    return Math.max(100, Math.min(5000, Number(initialDraft?.loan) || 1500));
  });
  const [termDays, setTermDays] = useState(() => {
    if (initialDraft?.termDays) return initialDraft.termDays;
    return Math.max(6, Math.min(90, Number(initialDraft?.days) || 60));
  });
  const [fullName, setFullName] = useState(initialDraft?.fullName || "");
  const [email, setEmail] = useState(initialDraft?.email || "");
  const [emailTouched, setEmailTouched] = useState(false);
  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  const [phone, setPhone] = useState(user?.phone || initialDraft?.phone || "");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [idNumber, setIdNumber] = useState(user?.idNumber || initialDraft?.idNumber || "");
  const [idNumberTouched, setIdNumberTouched] = useState(false);
  const [persalNumber, setPersalNumber] = useState(user?.persalNumber || initialDraft?.persalNumber || "");
  const [grossSalary, setGrossSalary] = useState(initialDraft?.grossSalary || 0);
  const [disposableIncome, setDisposableIncome] = useState(initialDraft?.disposableIncome || 0);
  const [bankName, setBankName] = useState(user?.bankName || initialDraft?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user?.accountNumber || initialDraft?.accountNumber || "");
  const [accountType, setAccountType] = useState(user?.accountType || initialDraft?.accountType || "CHEQUE");
  const [branchCode, setBranchCode] = useState(user?.branchCode || initialDraft?.branchCode || "");

  // --- EFFECTS ---
  useEffect(() => {
    if (BANK_BRANCH_CODES[bankName]) {
      setBranchCode(BANK_BRANCH_CODES[bankName]);
    } else {
      setBranchCode("");
    }
  }, [bankName]);

  // --- OTHER HOOKS ---
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLoggedIn = !!user?.isLoggedIn;
  const isReturningUser = user?.isReturningUser ?? false;
  const hasActiveLoan = user?.hasActiveLoan ?? false;
  const hasPendingLoan = user?.hasPendingLoan ?? false;
  const faceIdVerified = user?.faceIdVerified ?? false;
  const applicationStatus = user?.applicationStatus ?? null;

  // (removed duplicate amount and termDays state declarations)


  // Auto-fill branch code when bank changes
  // No need for Capitec branch city, just use universal code
  function handleBankChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedBank = e.target.value;
    setBankName(selectedBank);
    // branchCode will be set by useEffect
  }
  const [bankStatementDocument, setBankStatementDocument] = useState<UploadedDocument | null>(initialDraft?.bankStatementDocument || null);
  const [guestIdFront, setGuestIdFront] = useState<UploadedDocument | null>(initialDraft?.guestIdFront || null);
  // Removed guestIdBack: only front of ID is required
  function onGuestIdUpload(event: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      setError("ID Document must be a JPG or PNG image.");
      if (side === 'front') setGuestIdFront(null);
      // Removed guestIdBack logic
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("ID Document file must be 2MB or smaller.");
      if (side === 'front') setGuestIdFront(null);
      // Removed guestIdBack logic
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl || dataUrl.length < 100) {
        setError("Uploaded ID Document is invalid. Please try again.");
        if (side === 'front') setGuestIdFront(null);
        // Removed guestIdBack logic
        return;
      }
      setError("");
      const doc = { name: file.name, type: file.type, size: file.size, dataUrl };
      if (side === 'front') setGuestIdFront(doc);
      // Removed guestIdBack logic
    };
    reader.onerror = () => {
      setError("Could not read uploaded ID Document. Please try again.");
      if (side === 'front') setGuestIdFront(null);
      // Removed guestIdBack logic
    };
    reader.readAsDataURL(file);
  }

  // Mandate
  const [debitMandateAccepted, setDebitMandateAccepted] = useState(initialDraft?.debitMandateAccepted || false);

  // Documents (for logged-in flow)
  const [documents, setDocuments] = useState<Record<string, UploadedDocument | null>>(initialDraft?.documents || {
    idDocumentFront: null,
    // idDocumentBack removed
    proofOfIncome: null,
    proofOfResidence: null,
    bankStatement: null,
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [maxLoan, setMaxLoan] = useState(0);


  // Deterministic number formatting to avoid hydration mismatch
  function formatWithCommas(value: number) {
    const rounded = Math.round(value);
    return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Loan calculations
  const { termMonths, monthlyRepayment, totalCost, totalRepayable } = calculateLoanCharges(amount, termDays);
  const repayDate = new Date();
  repayDate.setDate(repayDate.getDate() + termDays);
  const repayDateLabel = repayDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

  function validatePhone(v: string) {
    return SA_PHONE_PATTERN.test(v.replace(/\s/g, ""));
  }

  function onBankStatementUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a PDF, JPG, or PNG bank statement.");
      setBankStatementDocument(null);
      return;
    }
    if (file.size > MAX_BANK_STATEMENT_SIZE_BYTES) {
      setError("Bank statement file must be 2MB or smaller.");
      setBankStatementDocument(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl || dataUrl.length < 100) {
        setError("Uploaded bank statement is invalid. Please try again.");
        setBankStatementDocument(null);
        return;
      }
      setError("");
      setBankStatementDocument({ name: file.name, type: file.type, size: file.size, dataUrl });
    };
    reader.onerror = () => {
      setError("Could not read uploaded bank statement. Please try again.");
      setBankStatementDocument(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleDocumentChange(field: string, file: File | null) {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    const nextDocument = { name: file.name, dataUrl, type: file.type, size: file.size };
    const nextDocuments = { ...documents, [field]: nextDocument };
    setDocuments(nextDocuments);
    // Optionally persist draft for logged-in users
    if (isLoggedIn) {
      await fetch("/api/loan-application-draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: { [field]: nextDocument } }),
      });
    }
  }

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    if (disposableIncome > grossSalary) {
      setError("Disposable income cannot be more than gross salary.");
      setCalculated(false);
      return;
    }
    let userLoanCap = getMaxLoanForUser(isReturningUser);
    let max = Math.max(0, calculateLogicalMaxLoan(grossSalary, disposableIncome, userLoanCap));
    max = Math.round(max / 100) * 100;
    setMaxLoan(max);
    setAmount(max);
    setError("");
    setCalculated(true);
    setTermDays(90); // default to 3 months
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation (shared)
    if (!isLoggedIn && !fullName.trim()) { setError("Please enter your full name."); return; }
    if (!isLoggedIn && (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) { setError("Please enter a valid email address."); return; }
    if (!validatePhone(phone)) { setError("Please enter a valid South African phone number (e.g. 0821234567)."); return; }
    if (!idNumber.trim()) { setError("Please enter your South African ID number."); return; }
    if (!isSouthAfricanIdNumber(idNumber)) { setError("Please enter a valid 13-digit South African ID number."); return; }
    if (!persalNumber.trim()) { setError("Please enter your Persal number."); return; }
    if (grossSalary <= 0) { setError("Please enter your gross monthly salary."); return; }
    if (disposableIncome <= 0 || disposableIncome > grossSalary) { setError("Please enter a valid disposable income amount."); return; }
    if (!bankName) { setError("Please select your bank."); return; }
    if (!accountNumber.trim()) { setError("Please enter your account number."); return; }
    if (!branchCode.trim()) { setError("Please enter your branch code."); return; }
    if (!debitMandateAccepted) { setError("You must accept the debit mandate to apply."); return; }

    // Document validation
    if (isLoggedIn) {
      if (!documents.idDocumentFront || !documents.proofOfIncome || !documents.proofOfResidence || !documents.bankStatement) {
        setError("Please upload both front and back of your ID Document (JPG or PNG), proof of income, proof of residence, and bank statement before submitting your application.");
        return;
      }
    } else {
      if (!bankStatementDocument) { setError("Please upload your latest 3-month bank statement."); return; }
      if (!guestIdFront) { setError("Please upload the front of your ID Document (JPG or PNG)."); return; }
    }

    setSubmitting(true);
    try {
      if (isLoggedIn) {
        // Save draft
        await fetch("/api/loan-application-draft", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              requestedAmount: amount,
              requestedTermDays: termDays,
              requestedGrossSalary: grossSalary,
              requestedDisposableIncome: disposableIncome,
              bankName,
              accountNumber,
              accountType,
              branchCode,
              phone,
              idNumber,
              persalNumber,
            },
            documents,
          }),
        });
        // Submit application
        const response = await fetch("/api/loans/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            termDays,
            grossSalary,
            disposableIncome,
            phone,
            idNumber,
            persalNumber,
            bankName,
            accountNumber,
            accountType,
            branchCode,
            debitMandateAccepted,
          }),
        });
        if (response.ok) {
          if (onAfterSubmit) onAfterSubmit();
          router.push("/dashboard/lending/application-status");
          return;
        }
        let message = "Failed to submit application.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          message = "Failed to submit application.";
        }
        setError(message);
      } else {
        // Guest flow: save draft and go to statement page
        const draft = {
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
          bankStatementDocument,
          guestIdFront,
          // guestIdBack removed
          debitMandateAccepted,
          createdAt: Date.now(),
        };
        sessionStorage.setItem("guestLoanApplyDraft", JSON.stringify(draft));
        if (onAfterSubmit) onAfterSubmit();
        router.push("/apply/statement");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- UI ---
  return (
    <div className={isLoggedIn ? "max-w-2xl mx-auto py-12" : "min-h-screen bg-gray-50"}>
      {/* Header with logo and login button for guests */}
      {!isLoggedIn && (
        <>
          {/* PublicHeader component */}
          <div className="mb-4">
            {/** Dynamically import to avoid SSR issues if any */}
            {React.createElement(require("./PublicHeader").default)}
          </div>
        </>
      )}

      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Loan Summary */}
        <div className="bg-persal-dark text-white rounded-2xl p-6 mb-8 shadow-lg">
          <h1 className="text-xl font-bold mb-1 text-center">Your Loan Application</h1>
          <p className="text-teal-200 text-sm mb-5 text-center">No account needed — just fill in your details below.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-white">R{formatWithCommas(amount)}</div>
              <div className="text-teal-300 text-xs mt-1">Loan Amount</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{termDays}</div>
              <div className="text-teal-300 text-xs mt-1">Days</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-300">R{formatWithCommas(monthlyRepayment)}</div>
              <div className="text-teal-300 text-xs mt-1">Monthly Repayment</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex flex-col md:flex-row items-center justify-center gap-2 text-sm text-teal-200 text-center">
            <span className="md:w-1/2">Interest & Fees: <span className="text-white font-semibold">R{formatWithCommas(totalCost)}</span></span>
            <span className="md:w-1/2">{termMonths} monthly repayments, final by: <span className="text-white font-semibold">{repayDateLabel}</span></span>
          </div>
        </div>

        {/* Optional SignUp banner (always show guest layout) */}
        {/* Signup banner removed */}

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Personal Details (always show guest layout) */}
          <div className="p-6">
            <h2 className="text-base font-semibold text-persal-dark mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="block text-gray-700 text-sm mb-2" htmlFor="fullName">Full Name</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue"
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="As it appears on your ID"
                  required
                />
                {emailTouched && !validateEmail(email) && (
                  <div className="text-red-600 text-xs mt-1">Please enter a valid email address.</div>
                )}
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-2" htmlFor="phone">SA Cell Number</label>
                <input
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm mt-0 focus:outline-none focus:border-persal-blue ${phoneTouched && !validatePhone(phone) ? 'border-red-500' : 'border-gray-300'}`}
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="0821234567"
                  required
                />
                {phoneTouched && !validatePhone(phone) && (
                  <div className="text-red-600 text-xs mt-1">Please enter a valid South African phone number (e.g. 0821234567).</div>
                )}
              </div>
            </div>
          </div>
          {/* Income */}
          <div className="p-6">
            <h2 className="text-base font-semibold text-persal-dark mb-4">Income Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="block text-gray-700 text-sm mb-2" htmlFor="grossSalary">Gross Monthly Salary (R)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mt-0 focus:outline-none focus:border-persal-blue"
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
                <label className="block text-gray-700 text-sm mb-2" htmlFor="disposableIncome">
                  Disposable Income (R)
                  <span className="ml-1 text-gray-400 font-normal text-xs">(after expenses)</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mt-0 focus:outline-none focus:border-persal-blue"
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
          <div className="p-6">
            <h2 className="text-base font-semibold text-persal-dark mb-4">Banking Details</h2>
            <p className="text-xs text-gray-500 mb-4">Loan will be disbursed to this account. Repayments deducted via Persal payroll.</p>
            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 text-sm mb-2" htmlFor="bankName">Bank</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mt-0 focus:outline-none focus:border-persal-blue bg-white"
                  id="bankName"
                  value={bankName}
                  onChange={handleBankChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-persal-blue bg-white"
                  required
                >
                  <option value="">Select your bank</option>
                  {SOUTH_AFRICAN_BANK_NAMES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {/* Show branch code clearly below for mobile users */}
                {bankName && branchCode && (
                  <div className="mt-2 text-sm text-persal-dark font-semibold bg-gray-100 rounded px-2 py-1 w-full text-center">
                    Branch Code: <span className="text-persal-blue">{branchCode}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className="block text-gray-700 text-sm mb-2" htmlFor="accountNumber">Account Number</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mt-0 focus:outline-none focus:border-persal-blue"
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
                  <label className="block text-gray-700 text-sm mb-2" htmlFor="accountType">Account Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mt-0 focus:outline-none focus:border-persal-blue bg-white"
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
                {/* Branch Code field removed as requested. Only display under Bank select remains. */}
              </div>
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="p-6">
            <h2 className="text-base font-semibold text-persal-dark mb-3">Supporting Documents</h2>
            <div>
              <p className="text-xs text-gray-500 mb-4">Upload your latest 3 months bank statement (PDF, JPG, or PNG up to 2MB).</p>
              <label className="block text-gray-700 text-sm mb-1" htmlFor="bankStatement">3 Months Bank Statement</label>
              <input
                id="bankStatement"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={isLoggedIn ? (e => handleDocumentChange("bankStatement", e.target.files?.[0] ?? null)) : onBankStatementUpload}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-persal-blue file:px-3 file:py-1.5 file:text-white"
                required
              />
              <p className="mt-2 text-xs text-gray-600">
                {(isLoggedIn ? documents.bankStatement : bankStatementDocument)
                  ? `Selected: ${(isLoggedIn ? documents.bankStatement?.name : bankStatementDocument?.name)} (${Math.round((isLoggedIn ? documents.bankStatement?.size : bankStatementDocument?.size) / 1024)} KB)`
                  : "No file selected yet."}
              </p>
              <div className="mt-6">
                <label className="block text-gray-700 text-sm mb-1">ID Document (Front, JPG or PNG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={isLoggedIn ? (e => handleDocumentChange("idDocumentFront", e.target.files?.[0] ?? null)) : (e => onGuestIdUpload(e, 'front'))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-persal-blue file:px-3 file:py-1.5 file:text-white"
                  required
                />
                <p className="mt-2 text-xs text-gray-600">
                  {(isLoggedIn ? documents.idDocumentFront : guestIdFront)
                    ? `Selected: ${(isLoggedIn ? documents.idDocumentFront?.name : guestIdFront?.name)} (${Math.round((isLoggedIn ? documents.idDocumentFront?.size : guestIdFront?.size) / 1024)} KB)`
                    : "No file selected yet."}
                </p>
              </div>
            </div>
          </div>

          {/* Debit Mandate */}
          <div className="p-6">
            <h2 className="text-base font-semibold text-persal-dark mb-3">Debit Mandate</h2>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              By accepting, you authorise Persal Loans to deduct <strong>{termMonths} monthly repayment{termMonths > 1 ? "s" : ""}</strong> of <strong>R{monthlyRepayment.toFixed(2)}</strong> from your salary via the Persal payroll system. Your final repayment is due on or around <strong>{repayDateLabel}</strong>. This mandate is governed by the National Credit Act and may be cancelled with written notice.
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
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl text-base shadow-lg transition"
            disabled={submitting}
          >
            {isLoggedIn ? (submitting ? "Submitting..." : "Submit Application") : "Next"}
          </button>

          <p className="text-center text-xs text-gray-500 pb-6">
            By submitting, you agree to our{" "}
            <Link href="/terms" className="underline text-persal-blue">Terms & Conditions</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline text-persal-blue">Privacy Policy</Link>.
          </p>
        </form>
      </main>
    </div>
  );
}
