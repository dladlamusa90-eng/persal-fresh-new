"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  FIRST_TIME_MAX_LOAN,
  MIN_DISPOSABLE_INCOME_FOR_LOAN,
  MAX_LOAN_DISPOSABLE_INCOME_RATIO,
  RETURNING_MAX_LOAN,
  calculateLoanCharges,
  calculateLogicalMaxLoan,
  getMaxLoanForUser,
} from "@/lib/loanPolicy";
import { SOUTH_AFRICAN_BANK_NAMES } from "@/lib/validators/auth";

function ApplyPageContent() {
  const router = useRouter();
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [hasPendingLoan, setHasPendingLoan] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [faceIdVerified, setFaceIdVerified] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | null>(null);
  // Eligibility/calculation state
  const searchParams = useSearchParams();
  const [salary, setSalary] = useState(() => Number(searchParams.get("salary")) || 5000);
  const [disposable, setDisposable] = useState(() => Number(searchParams.get("disposable")) || 2500);
  const [maxLoan, setMaxLoan] = useState(0);
  const [desiredLoan, setDesiredLoan] = useState(() => Number(searchParams.get("loan")) || 0);
  const [term, setTerm] = useState(() => Number(searchParams.get("term")) || 3);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [persalNumber, setPersalNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("CHEQUE");
  const [branchCode, setBranchCode] = useState("");
  const [debitMandateAccepted, setDebitMandateAccepted] = useState(false);
  const [documents, setDocuments] = useState<Record<string, { name: string; dataUrl: string; type: string; size: number } | null>>({
    identityDocument: null,
    proofOfIncome: null,
    proofOfResidence: null,
    bankStatement: null,
  });

  const userLoanCap = getMaxLoanForUser(isReturningUser);

  function getApplyReturnTo() {
    const currentQuery = searchParams.toString();
    return `/dashboard/lending/apply${currentQuery ? `?${currentQuery}` : ""}`;
  }

  function openFaceVerificationWindow() {
    if (typeof window === "undefined") return false;

    const popupUrl = `/dashboard/lending/face-verification?popup=1&returnTo=${encodeURIComponent(getApplyReturnTo())}`;
    const popup = window.open(
      popupUrl,
      "persal-face-verification",
      "popup=yes,width=520,height=760,left=120,top=80,resizable=yes,scrollbars=yes"
    );

    if (!popup) {
      router.push(`/dashboard/lending/face-verification?returnTo=${encodeURIComponent(getApplyReturnTo())}`);
      return false;
    }

    popup.focus();
    return true;
  }

  // On mount, if query params present, auto-calculate eligibility
  useEffect(() => {
    if (searchParams.get("salary") && searchParams.get("disposable")) {
      let max = Math.max(
        0,
        calculateLogicalMaxLoan(
          Number(searchParams.get("salary")),
          Number(searchParams.get("disposable")),
          userLoanCap
        )
      );
      max = Math.round(max / 100) * 100;
      setMaxLoan(max);
      setCalculated(true);
    }
  }, [searchParams, userLoanCap]);

  useEffect(() => {
    let mounted = true;

    async function loadLoanState() {
      try {
        const [loanResponse, userResponse, draftResponse] = await Promise.all([
          fetch("/api/loans/me", { cache: "no-store" }),
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/loan-application-draft", { cache: "no-store" }),
        ]);

        if (loanResponse.ok) {
          const loanBody = (await loanResponse.json()) as {
            latestLoan?: { status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID" } | null;
            isReturningUser?: boolean;
          };

          const status = loanBody.latestLoan?.status;
          if (mounted) {
            setIsReturningUser(Boolean(loanBody.isReturningUser));
            setHasPendingLoan(status === "PENDING");
          }
          if (mounted && status === "APPROVED") {
            setHasActiveLoan(true);
          }
        }

        if (userResponse.ok && mounted) {
          const userBody = (await userResponse.json()) as {
            user?: {
              phone?: string | null;
              idNumber?: string | null;
              persalNumber?: string | null;
              bankName?: string | null;
              accountNumber?: string | null;
              accountType?: "CHEQUE" | "SAVINGS" | "TRANSMISSION" | null;
              branchCode?: string | null;
              applicationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
            };
          };

          const user = userBody.user;
          if (user) {
            setPhone(user.phone ?? "");
            setIdNumber(user.idNumber ?? "");
            setPersalNumber(user.persalNumber ?? "");
            setBankName(user.bankName ?? "");
            setAccountNumber(user.accountNumber ?? "");
            setAccountType(user.accountType ?? "CHEQUE");
            setBranchCode(user.branchCode ?? "");
            setApplicationStatus(user.applicationStatus ?? null);
          }
        }

        if (draftResponse.ok && mounted) {
          const draftBody = (await draftResponse.json()) as {
            draft?: {
              data?: {
                monthlyGrossIncome?: string;
                calculatedDisposableIncome?: string;
                requestedAmount?: number;
                requestedTermDays?: number;
                bankName?: string;
                accountNumber?: string;
                accountType?: string;
              };
              documents?: Record<string, { name: string; dataUrl: string; type: string; size: number } | null>;
            };
          };

          const data = draftBody.draft?.data;
          if (data?.monthlyGrossIncome) setSalary(Number(data.monthlyGrossIncome) || 5000);
          if (data?.calculatedDisposableIncome) setDisposable(Number(data.calculatedDisposableIncome) || 2500);
          if (typeof data?.requestedAmount === "number") setDesiredLoan(data.requestedAmount);
          if (typeof data?.requestedTermDays === "number") setTerm(Math.max(1, Math.min(3, Math.floor(data.requestedTermDays / 30))));
          if (data?.bankName) setBankName(data.bankName);
          if (data?.accountNumber) setAccountNumber(data.accountNumber);
          if (data?.accountType) setAccountType(data.accountType);
          if (draftBody.draft?.documents) setDocuments({
            identityDocument: draftBody.draft.documents.identityDocument ?? null,
            proofOfIncome: draftBody.draft.documents.proofOfIncome ?? null,
            proofOfResidence: draftBody.draft.documents.proofOfResidence ?? null,
            bankStatement: draftBody.draft.documents.bankStatement ?? null,
          });
        }

        try {
          const faceIdRes = await fetch("/api/faceid/session", { cache: "no-store" });
          if (faceIdRes.ok && mounted) {
            const fd = (await faceIdRes.json()) as { verified?: boolean };
            if (fd.verified) setFaceIdVerified(true);
          }
        } catch {
          // ignore - user can still navigate to dedicated face verification screen
        }
      } catch {
        return;
      }
    }

    loadLoanState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    async function refreshFaceStatus() {
      try {
        const response = await fetch("/api/faceid/session", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { verified?: boolean };
        if (body.verified) {
          setFaceIdVerified(true);
          setError("");
        }
      } catch {
        // ignore
      }
    }

    function handleFaceVerified(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "persal-faceid-verified") return;
      void refreshFaceStatus();
    }

    window.addEventListener("message", handleFaceVerified);
    return () => window.removeEventListener("message", handleFaceVerified);
  }, []);

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    if (disposable > salary) {
      setError("Disposable income cannot be more than gross salary.");
      setCalculated(false);
      return;
    }
    let max = Math.max(0, calculateLogicalMaxLoan(salary, disposable, userLoanCap));
    max = Math.round(max / 100) * 100;
    setMaxLoan(max);
    setDesiredLoan(max);
    setError("");
    setCalculated(true);
    setTerm(3);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (hasActiveLoan) return;

    if (!faceIdVerified) {
      setError("Complete face verification in the secure window to continue with your application.");
      openFaceVerificationWindow();
      return;
    }

    if (!calculated || desiredLoan < 100) {
      setError("Please calculate eligibility and choose a valid loan amount.");
      return;
    }

    if (!phone || !idNumber || !persalNumber || !bankName || !accountNumber || !branchCode) {
      setError("Please complete all debit and banking details.");
      return;
    }

    if (!debitMandateAccepted) {
      setError("You must accept the debit mandate to submit your request.");
      return;
    }

    if (!documents.identityDocument || !documents.proofOfIncome || !documents.proofOfResidence || !documents.bankStatement) {
      setError("Please upload all required documents before submitting your application.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await fetch("/api/loan-application-draft", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            requestedAmount: desiredLoan,
            requestedTermDays: term * 30,
            requestedGrossSalary: salary,
            requestedDisposableIncome: disposable,
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

      const response = await fetch("/api/loans/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: desiredLoan,
          termDays: term * 30,
          grossSalary: salary,
          disposableIncome: disposable,
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

      if (response.status === 409) {
        setHasActiveLoan(true);
      }

      setError(message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- FORMULA BASED ON EXAMPLES ---
  const { interestMonth1, interestMonth2, interestMonth3, initiationFee, serviceFee, totalCost, totalRepayable } =
    calculateLoanCharges(desiredLoan, term * 30);

  async function handleDocumentChange(field: "identityDocument" | "proofOfIncome" | "proofOfResidence" | "bankStatement", file: File | null) {
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    const nextDocument = {
      name: file.name,
      dataUrl,
      type: file.type,
      size: file.size,
    };

    const nextDocuments = {
      ...documents,
      [field]: nextDocument,
    };

    setDocuments(nextDocuments);

    await fetch("/api/loan-application-draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents: { [field]: nextDocument } }),
    });
  }

  return (
    <section className="max-w-2xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Apply for a Loan</h2>
      <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded text-teal-800 text-sm">
        <strong>Legal Notice:</strong> First-time users can borrow up to <b>R{FIRST_TIME_MAX_LOAN.toLocaleString()}</b>, returning users up to <b>R{RETURNING_MAX_LOAN.toLocaleString()}</b>. For affordability, approved loan amount cannot exceed <b>{Math.round(MAX_LOAN_DISPOSABLE_INCOME_RATIO * 100)}%</b> of disposable income. Applications with disposable income below <b>R{MIN_DISPOSABLE_INCOME_FOR_LOAN.toLocaleString()}</b> may still be submitted for admin review and can be rejected for insufficient disposable income. Maximum term is <b>3 months</b>. Only one active loan per client is allowed.
      </div>
      <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded text-gray-700 text-sm">
        Profile limit: <b>{isReturningUser ? "Returning user" : "First-time user"}</b> (up to <b>R{userLoanCap.toLocaleString()}</b>).
      </div>
      {hasActiveLoan && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm font-semibold">
          You already have an active loan. You cannot apply for another loan until your current loan is settled.
        </div>
      )}
      {!hasActiveLoan && applicationStatus === "PENDING" && (
        <div className="mb-6 p-5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm font-semibold">
          <p className="text-base font-bold mb-1">Application Under Review</p>
          Your account application is currently being reviewed by our team. Once your Persal number and personal details are verified and approved, you will be able to apply for a loan. This typically takes 1–2 business days.
        </div>
      )}
      {!hasActiveLoan && applicationStatus === "REJECTED" && (
        <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm font-semibold">
          <p className="text-base font-bold mb-1">Application Not Approved</p>
          Your account application was not approved. Please contact our support team for assistance.
        </div>
      )}
      {!hasActiveLoan && hasPendingLoan && applicationStatus === "APPROVED" && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm font-semibold">
          You already have a pending application. If you continue and submit a new one, your previous pending application will be cancelled and replaced.
        </div>
      )}
      {applicationStatus === "APPROVED" && !hasActiveLoan && (
      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Eligibility Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <span className="text-gray-500 text-xs">Gross Salary</span>
            <input
              type="number"
              min={0}
              value={salary}
              onChange={e => setSalary(Number(e.target.value))}
              className="w-full border rounded p-2 mt-2 text-lg font-bold text-gray-900"
              disabled={hasActiveLoan}
            />
          </div>
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <span className="text-gray-500 text-xs">Disposable Income</span>
            <input
              type="number"
              min={0}
              value={disposable}
              onChange={e => setDisposable(Number(e.target.value))}
              className="w-full border rounded p-2 mt-2 text-lg font-bold text-gray-900"
              disabled={hasActiveLoan}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleCalculate}
          className={`px-6 py-3 rounded-xl font-semibold transition w-full md:w-auto ${hasActiveLoan ? "bg-gray-300 text-gray-400 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700"}`}
          disabled={hasActiveLoan}
        >
          Calculate Eligibility
        </button>
        {error && <div className="mt-2 text-red-600 font-semibold text-sm">{error}</div>}
        {calculated && !error && (
          <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200 flex flex-col gap-6">
            <div className="text-lg font-semibold text-gray-900">Maximum Loan Amount: <span className="text-teal-700 whitespace-nowrap">R {maxLoan.toLocaleString()}</span></div>
            <div>
              <label className="block text-gray-700 mb-2">Select Loan Amount (up to max)</label>
              <input
                type="range"
                min={100}
                max={maxLoan}
                step={100}
                value={desiredLoan}
                onChange={e => setDesiredLoan(Number(e.target.value))}
                className="w-full"
                disabled={maxLoan < 100 || hasActiveLoan}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span className="whitespace-nowrap">R 100</span>
                <span className="whitespace-nowrap">R {maxLoan.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-lg font-semibold whitespace-nowrap">R {desiredLoan.toLocaleString()}</div>
              {maxLoan < 100 && (
                <div className="text-red-600 text-sm mt-2">You are currently not eligible for a loan based on your salary/disposable income profile.</div>
              )}
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Select Term</label>
              <select value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full border rounded p-2" disabled={hasActiveLoan}>
                <option value={1}>1 Month (full repayment with interest)</option>
                <option value={2}>2 Months (full payment at term end)</option>
                <option value={3}>3 Months (full payment at term end)</option>
              </select>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col gap-2">
              <span className="text-gray-500 text-xs">Breakdown</span>
              <div className="flex justify-between text-sm">
                <span>Loan Amount</span>
                <span className="whitespace-nowrap">R {desiredLoan.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Interest (Month 1, 5%)</span>
                <span className="whitespace-nowrap">R {interestMonth1.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
              </div>
              {term >= 2 && (
                <div className="flex justify-between text-sm">
                  <span>Interest (Month 2, 3%)</span>
                  <span className="whitespace-nowrap">R {interestMonth2.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                </div>
              )}
              {term === 3 && (
                <div className="flex justify-between text-sm">
                  <span>Interest (Month 3, 2%)</span>
                  <span className="whitespace-nowrap">R {interestMonth3.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Initiation Fee</span>
                <span className="whitespace-nowrap">R {initiationFee.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Service Fee (once-off)</span>
                <span className="whitespace-nowrap">R {serviceFee.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mt-2">
                <span>Total Cost (Interest + Fees)</span>
                <span className="whitespace-nowrap">R {totalCost.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between text-base font-bold mt-2">
                <span>Total Repayable (deducted at end)</span>
                <span className="whitespace-nowrap">R {totalRepayable.toLocaleString()}</span>
              </div>
              <span className="text-xs text-gray-500 mt-2">Money is withdrawn once, at the end of your selected period.</span>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Debit & Banking Details</h3>
          <p className="text-sm text-gray-600">
            These details are required to process your debit mandate and end-of-term collection.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 mb-2">Cell Number</label>
            <input type="text" className="w-full border rounded p-2" value={phone} onChange={e => setPhone(e.target.value)} disabled={hasActiveLoan} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">ID Number</label>
            <input type="text" className="w-full border rounded p-2" value={idNumber} onChange={e => setIdNumber(e.target.value)} disabled={hasActiveLoan} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Persal Number</label>
            <input type="text" className="w-full border rounded p-2" value={persalNumber} onChange={e => setPersalNumber(e.target.value)} disabled={hasActiveLoan} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Bank Name</label>
            <select className="w-full border rounded p-2" value={bankName} onChange={e => setBankName(e.target.value)} disabled={hasActiveLoan} required>
              <option value="">Select bank</option>
              {SOUTH_AFRICAN_BANK_NAMES.map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Account Number</label>
            <input type="text" className="w-full border rounded p-2" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} disabled={hasActiveLoan} required />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Account Type</label>
            <select className="w-full border rounded p-2" value={accountType} onChange={e => setAccountType(e.target.value)} disabled={hasActiveLoan} required>
              <option value="CHEQUE">Cheque</option>
              <option value="SAVINGS">Savings</option>
              <option value="TRANSMISSION">Transmission</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Branch Code</label>
            <input type="text" className="w-full border rounded p-2" value={branchCode} onChange={e => setBranchCode(e.target.value)} disabled={hasActiveLoan} required />
          </div>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="consent"
            className="mr-2"
            disabled={hasActiveLoan}
            checked={debitMandateAccepted}
            onChange={(event) => setDebitMandateAccepted(event.target.checked)}
            required
          />
          <label htmlFor="consent" className="text-gray-700">
            I authorize debit collection from this account at term end and accept the debit mandate terms.
          </label>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Required Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2">Identity Document</label>
              <input type="file" className="w-full border rounded p-2" disabled={hasActiveLoan} onChange={e => void handleDocumentChange("identityDocument", e.target.files?.[0] ?? null)} />
              {documents.identityDocument && <p className="mt-2 text-xs text-green-700">Saved: {documents.identityDocument.name}</p>}
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Proof of Income</label>
              <input type="file" className="w-full border rounded p-2" disabled={hasActiveLoan} onChange={e => void handleDocumentChange("proofOfIncome", e.target.files?.[0] ?? null)} />
              {documents.proofOfIncome && <p className="mt-2 text-xs text-green-700">Saved: {documents.proofOfIncome.name}</p>}
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Proof of Residence</label>
              <input type="file" className="w-full border rounded p-2" disabled={hasActiveLoan} onChange={e => void handleDocumentChange("proofOfResidence", e.target.files?.[0] ?? null)} />
              {documents.proofOfResidence && <p className="mt-2 text-xs text-green-700">Saved: {documents.proofOfResidence.name}</p>}
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Bank Statement</label>
              <input type="file" className="w-full border rounded p-2" disabled={hasActiveLoan} onChange={e => void handleDocumentChange("bankStatement", e.target.files?.[0] ?? null)} />
              {documents.bankStatement && <p className="mt-2 text-xs text-green-700">Saved: {documents.bankStatement.name}</p>}
            </div>
          </div>
        </div>
        {error && <div className="text-red-600 font-semibold text-sm">{error}</div>}
        {!hasActiveLoan && !faceIdVerified && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Face verification required</p>
              <p className="text-xs md:text-sm text-amber-800 mt-1">
                Complete face verification on a dedicated secure screen before submitting your loan application.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                openFaceVerificationWindow();
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition"
            >
              Verify Face
            </button>
          </div>
        )}
        {faceIdVerified && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <span className="text-green-600 text-xl font-bold">✓</span>
            <span className="text-green-700 font-semibold text-sm">Face verified. You may submit your application.</span>
          </div>
        )}
        <button
          type="submit"
          className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          disabled={hasActiveLoan || submitting}
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
      )}
    </section>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<section className="max-w-2xl mx-auto py-12" />}>
      <ApplyPageContent />
    </Suspense>
  );
}
