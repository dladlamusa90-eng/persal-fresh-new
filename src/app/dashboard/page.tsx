"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { calculateLoanCharges } from "@/lib/loanPolicy";

const REPAY_DAYS = [1, 15, 25, 30, 31] as const;

function getRepayDate(today: Date, monthOffset: number, repayDay: number): Date {
  const raw = today.getMonth() + monthOffset;
  const year = today.getFullYear() + Math.floor(raw / 12);
  const month = raw % 12;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(repayDay, daysInMonth));
}

function ordinalLabel(n: number): string {
  const v = n % 100;
  const s = (v >= 11 && v <= 13) ? "th" : (["st", "nd", "rd"][n % 10 - 1] ?? "th");
  return `${n}${s}`;
}

// Persal status helper
function getPersalStatus(user) {
  if (!user?.persalNumber) return "missing";
  if (user?.applicationStatus === "REJECTED") return "rejected";
  if (user?.applicationStatus === "PENDING") return "pending";
  if (user?.applicationStatus === "APPROVED") return "approved";
  return "unknown";
}

function DashboardHomeInner() {
  const router = useRouter();
  const maxLoan = 5000;
  const LOAN_CALC_AMOUNT_KEY = "loanCalculatorAmount";
  const LOAN_CALC_DAYS_KEY = "loanCalculatorRepayIdx";
  const LOAN_CALC_MONTH_KEY = "loanCalculatorMonth";
  const [desiredLoan, setDesiredLoan] = useState(1500);
  const [selectedRepayIdx, setSelectedRepayIdx] = useState(2);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [hasPendingLoan, setHasPendingLoan] = useState(false);
  const [showPendingLoanModal, setShowPendingLoanModal] = useState(false);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState("");
  const [error, setError] = useState("");
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const searchParams = useSearchParams();
  const [activeMyLoanSection, setActiveMyLoanSection] = useState<"summary" | "documents">(
    (searchParams.get("tab") as "summary" | "documents" | null) === "documents" ? "documents" : "summary"
  );
  const [firstName, setFirstName] = useState("");
  const [user, setUser] = useState(null);
  const [persalInput, setPersalInput] = useState("");
  const [persalError, setPersalError] = useState("");
  const [persalSubmitting, setPersalSubmitting] = useState(false);
  const [bankVerified, setBankVerified] = useState<boolean | null>(null);
  const [activeLoanData, setActiveLoanData] = useState<{
    amount: number;
    termDays: number;
    disbursementSentAt: string | null;
    createdAt: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLoan = localStorage.getItem(LOAN_CALC_AMOUNT_KEY);
    if (savedLoan) { const v = parseInt(savedLoan, 10); if (!isNaN(v) && v >= 100 && v <= 5000) setDesiredLoan(v); }
    const storedIdx = localStorage.getItem(LOAN_CALC_DAYS_KEY);
    if (storedIdx) { const v = parseInt(storedIdx, 10); if (!isNaN(v) && v >= 0 && v <= 4) setSelectedRepayIdx(v); }
    const storedMonth = localStorage.getItem(LOAN_CALC_MONTH_KEY);
    if (storedMonth) { const v = parseInt(storedMonth, 10); if (!isNaN(v) && v >= 1 && v <= 3) setSelectedMonth(v); }
    setMounted(true);

    Promise.all([
      fetch("/api/users/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/loans/me").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, loanData]) => {
        if (userData?.user?.fullName) {
          setFirstName(userData.user.fullName.trim().split(" ")[0]);
        }
        setUser(userData?.user || null);
        setBankVerified(userData?.user?.bankVerified ?? null);
        if (userData?.user?.persalNumber) setPersalInput(userData.user.persalNumber);
        const status = loanData?.latestLoan?.status;
        setHasPendingLoan(status === "PENDING");
        setHasActiveLoan(status === "APPROVED");
        if (status === "APPROVED" && loanData?.latestLoan) {
          setActiveLoanData({
            amount: loanData.latestLoan.amount,
            termDays: loanData.latestLoan.termDays,
            disbursementSentAt: loanData.latestLoan.disbursementSentAt ?? null,
            createdAt: loanData.latestLoan.createdAt,
          });
        }
      })
      .catch(() => {})
      .finally(() => {});
  }, []);

  const persalStatus = getPersalStatus(user);

  const canApply =
    !hasActiveLoan &&
    !error &&
    desiredLoan >= 100 &&
    desiredLoan <= maxLoan &&
    persalStatus === "approved" &&
    bankVerified === true;

  async function handlePersalSubmit(e) {
    e.preventDefault();
    setPersalError("");
    setPersalSubmitting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persalNumber: persalInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPersalError(data.error || "Unable to submit Persal number.");
      } else {
        setUser((u) => ({ ...u, persalNumber: persalInput, applicationStatus: "PENDING" }));
      }
    } catch {
      setPersalError("Network error. Please try again.");
    } finally {
      setPersalSubmitting(false);
    }
  }

  function updateDesiredLoan(value: number) {
    if (value < 100 || value > maxLoan) {
      setError("Loan amount must be between R100 and R5,000.");
    } else {
      setError("");
    }
    setDesiredLoan(value);
    localStorage.setItem(LOAN_CALC_AMOUNT_KEY, value.toString());
  }

  function updateSelectedRepayIdx(idx: number) {
    const clamped = Math.max(0, Math.min(4, idx));
    setSelectedRepayIdx(clamped);
    localStorage.setItem(LOAN_CALC_DAYS_KEY, clamped.toString());
  }

  function updateSelectedMonth(m: number) {
    const clamped = Math.max(1, Math.min(3, m));
    setSelectedMonth(clamped);
    localStorage.setItem(LOAN_CALC_MONTH_KEY, clamped.toString());
  }

  const todayMidnight = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
  const repayDate = mounted ? getRepayDate(todayMidnight, selectedMonth, REPAY_DAYS[selectedRepayIdx]) : new Date();
  const termDays = mounted ? Math.ceil((repayDate.getTime() - todayMidnight.getTime()) / 86400000) : 25;
  const {
    termMonths,
    interestMonth1,
    interestMonth2,
    interestMonth3,
    initiationFee,
    serviceFee,
    totalCost,
    totalRepayable,
    monthlyRepayment,
  } = calculateLoanCharges(desiredLoan, termDays);
  const totalInterest = interestMonth1 + interestMonth2 + interestMonth3;
  const totalFees = initiationFee + serviceFee;
  const amountPercent = ((desiredLoan - 100) / (5000 - 100)) * 100;
  const amountKnobPercent = Math.min(97, Math.max(3, amountPercent));
  const dayKnobPercent = Math.min(97, Math.max(3, (selectedRepayIdx / 4) * 100));

  const repayDateLabelCompact = mounted ? repayDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/\s+/g, "") : "---";
  const repayDateDisplay = mounted ? (() => { const d = repayDate; return `${d.getDate()}/${d.toLocaleDateString("en-GB", { month: "short" })}/${d.getFullYear()}`; })() : "---";
  const applyNowHref = `/dashboard/lending/apply?loan=${desiredLoan}&term=${termMonths}&termDays=${termDays}`;

  function handleApplyNowClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!canApply) {
      event.preventDefault();
      return;
    }

    if (hasPendingLoan) {
      event.preventDefault();
      setOverrideError("");
      setShowPendingLoanModal(true);
    }
  }

  async function handleOverwriteApplication() {
    setOverrideError("");
    setOverrideSubmitting(true);

    try {
      const response = await fetch("/api/loans/pending/override", {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setOverrideError(body.error ?? "Failed to override pending application.");
        return;
      }

      setHasPendingLoan(false);
      setShowPendingLoanModal(false);
      router.push(applyNowHref);
    } catch {
      setOverrideError("Network error while overriding pending application.");
    } finally {
      setOverrideSubmitting(false);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-2 md:px-4 -mt-6 md:-mt-10 max-[480px]:mt-0">
      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6 md:gap-8">
        <aside className="pt-2 max-[480px]:hidden">
          <nav className="space-y-3 md:text-base">
            <button
              type="button"
              onClick={() => setActiveMyLoanSection("summary")}
              className={`block pb-1 w-fit transition ${activeMyLoanSection === "summary" ? "text-persal-blue font-semibold border-b-2 border-persal-blue" : "text-gray-700 hover:text-persal-blue"}`}
            >
              Loan summary
            </button>
            <button
              type="button"
              onClick={() => setActiveMyLoanSection("documents")}
              className={`block pb-1 w-fit transition ${activeMyLoanSection === "documents" ? "text-persal-blue font-semibold border-b-2 border-persal-blue" : "text-gray-700 hover:text-persal-blue"}`}
            >
              Loan documents
            </button>
          </nav>
        </aside>

        <div className="pb-8 max-[480px]:pb-4">

          {/* Mobile header — greeting + pill tabs */}
          <div className="md:hidden mb-4">
            <div className="mb-3">
              <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Hi {firstName || "there"}</h1>
              <p className="mt-0.5 text-sm text-gray-500">Apply for up to <span className="font-semibold text-persal-blue">R 5,000</span></p>
            </div>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveMyLoanSection("summary")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeMyLoanSection === "summary" ? "bg-white text-persal-blue shadow" : "text-gray-500"}`}
              >
                Loan Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveMyLoanSection("documents")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeMyLoanSection === "documents" ? "bg-white text-persal-blue shadow" : "text-gray-500"}`}
              >
                Documents
              </button>
            </div>
          </div>

          {/* Desktop heading */}
          <h1 className="hidden md:block text-[42px] text-gray-800 font-normal mb-4">Hi {firstName || "there"}</h1>

          {/* Desktop info bar */}
          <div className="hidden md:block mb-4">
            <div className="w-full rounded-xl bg-gray-100 px-5 py-3 text-gray-700 text-base flex items-center justify-center gap-2">
              <Lightbulb size={18} className="text-persal-blue" />
              <span>You can apply for up to <b>R 5000</b></span>
            </div>
          </div>

          {/* Bank verification warning banner */}
          {bankVerified === false && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <span className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Bank account not yet verified</p>
                <p className="mt-0.5 text-xs text-amber-800">You cannot apply for a loan until your bank account has been verified. Please complete bank verification to proceed.</p>
                <a
                  href="/dashboard/profile?section=banking"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  Verify Bank Account
                </a>
              </div>
            </div>
          )}

          {activeMyLoanSection === "summary" && (
          <div>

          {/* Active loan repayment progress */}
          {hasActiveLoan && activeLoanData && mounted && (() => {
            const { totalRepayable, monthlyRepayment } = calculateLoanCharges(activeLoanData.amount, activeLoanData.termDays);
            const startDate = activeLoanData.disbursementSentAt
              ? new Date(activeLoanData.disbursementSentAt)
              : new Date(activeLoanData.createdAt);
            const now = new Date();
            const daysElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 86400000));
            const daysTotal = activeLoanData.termDays;
            const daysRemaining = Math.max(0, daysTotal - daysElapsed);
            const timePercent = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));
            // Estimate remaining balance using monthly payment schedule
            const monthsElapsed = Math.floor(daysElapsed / 30);
            const estimatedPaid = Math.min(totalRepayable, monthlyRepayment * monthsElapsed);
            const estimatedRemaining = Math.max(0, totalRepayable - estimatedPaid);
            const paidPercent = Math.min(100, Math.round((estimatedPaid / totalRepayable) * 100));
            const dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + daysTotal);
            const dueDateStr = dueDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
            const urgency = timePercent >= 80 ? "red" : timePercent >= 50 ? "amber" : "green";
            const barColor = urgency === "red" ? "bg-red-500" : urgency === "amber" ? "bg-amber-400" : "bg-teal-500";
            const encouragement =
              paidPercent >= 80
                ? "Almost there — you're nearly done! 🎉"
                : paidPercent >= 50
                ? "Great progress — you're more than halfway through!"
                : paidPercent >= 25
                ? "Keep it up — you're making solid progress!"
                : "Your loan is active. Every payment brings you closer to zero!";

            return (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Coloured top strip */}
                <div className={`h-1 w-full ${barColor}`} />
                <div className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Active Loan</p>
                      <h3 className="text-base font-bold text-slate-900">Repayment Progress</h3>
                    </div>
                    <Link
                      href="/dashboard/lending/pay-now"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-persal-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-persal-dark transition"
                    >
                      Pay Now
                    </Link>
                  </div>

                  {/* Two stat pills */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Total borrowed</p>
                      <p className="text-lg font-bold text-slate-800">R {activeLoanData.amount.toLocaleString()}</p>
                    </div>
                    <div className={`rounded-xl px-3 py-2.5 border ${urgency === "red" ? "bg-red-50 border-red-100" : urgency === "amber" ? "bg-amber-50 border-amber-100" : "bg-teal-50 border-teal-100"}`}>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Est. remaining</p>
                      <p className={`text-lg font-bold ${urgency === "red" ? "text-red-700" : urgency === "amber" ? "text-amber-700" : "text-teal-700"}`}>
                        R {Math.round(estimatedRemaining).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>{paidPercent}% repaid</span>
                      <span>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>R 0</span>
                      <span>R {Math.round(totalRepayable).toLocaleString()} total owed</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">{encouragement}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Due date: <span className="font-medium text-slate-600">{dueDateStr}</span></p>
                </div>
              </div>
            );
          })()}
          <div id="calc" className="bg-white rounded-2xl shadow-[0_-10px_18px_-16px_rgba(2,12,27,0.35),0_22px_42px_-22px_rgba(2,12,27,0.58),0_10px_18px_-14px_rgba(2,12,27,0.35)] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12">
              <aside className="relative overflow-hidden md:col-span-4 bg-persal-dark text-white hidden md:block">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute inset-0 bg-gradient-to-b from-teal-700/25 via-teal-800/10 to-transparent" />
                  <svg viewBox="0 0 600 220" className="absolute -bottom-4 left-0 w-full h-40 text-teal-300/25" preserveAspectRatio="none">
                    <path d="M0 120 C90 70 180 170 270 120 C360 70 450 170 540 120 C570 102 590 90 600 95 L600 220 L0 220 Z" fill="currentColor" />
                  </svg>
                  <svg viewBox="0 0 600 220" className="absolute -bottom-10 left-0 w-full h-44 text-teal-200/20" preserveAspectRatio="none">
                    <path d="M0 140 C90 95 180 190 270 140 C360 95 450 190 540 140 C570 122 590 110 600 116 L600 220 L0 220 Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="relative z-10 p-4 md:p-5 border-b border-white/20">
                  <h3 className="text-orange-300 font-semibold text-lg mb-2">What you can get</h3>
                  <p className="text-white/95 leading-relaxed text-sm md:text-base font-semibold break-words">
                    Customers can apply for up to <b>R5000</b>, and can earn points to reduce their interest.
                  </p>
                </div>
                <div className="relative z-10 p-4 md:p-5 border-b border-white/20 bg-teal-900/25">
                  <h3 className="text-orange-300 font-semibold text-lg mb-2">What you&apos;ll need:</h3>
                  <ul className="space-y-2 text-sm md:text-base text-white/95 break-words">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="7" y="2" width="10" height="20" rx="2" /><line x1="10" y1="5" x2="14" y2="5" /><line x1="12" y1="18" x2="12" y2="18" />
                      </svg>
                      <span>A cellphone number</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><line x1="13" y1="10" x2="18" y2="10" /><line x1="13" y1="14" x2="18" y2="14" />
                      </svg>
                      <span>SA ID number</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <line x1="7" y1="10" x2="17" y2="10" />
                        <line x1="7" y1="14" x2="13" y2="14" />
                      </svg>
                      <span>Persal number</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="21" x2="21" y2="21" /><line x1="5" y1="21" x2="5" y2="10" /><line x1="9" y1="21" x2="9" y2="10" /><line x1="15" y1="21" x2="15" y2="10" /><line x1="19" y1="21" x2="19" y2="10" /><polygon points="12 3 2 10 22 10 12 3" />
                      </svg>
                      <span>3-months bank statement</span>
                    </li>
                  </ul>
                </div>
                <div className="relative z-10 p-4 md:p-5">
                  <h3 className="text-orange-300 font-semibold text-lg mb-2">How to apply</h3>
                  <ol className="space-y-2 text-sm md:text-base text-white/95 break-words">
                    <li><span className="text-orange-300 mr-2 font-bold">1</span>Choose the amount you need</li>
                    <li><span className="text-orange-300 mr-2 font-bold">2</span>Choose how long you will need to repay</li>
                    <li><span className="text-orange-300 mr-2 font-bold">3</span>Click <span className="font-bold">"Apply Now"</span> and proceed to finalise your loan</li>
                  </ol>
                </div>
              </aside>

              <div className="md:col-span-8 bg-gray-50 flex flex-col h-full max-[480px]:min-w-0">
                <div className="p-4 md:p-6 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-end">
                    <div className="flex flex-col">
                      <div className="text-base md:text-lg text-gray-700 mb-1">Loan Amount</div>
                      <div className="h-12 md:h-14 flex items-end">
                        <div className="text-4xl md:text-5xl font-normal text-persal-blue leading-none">{mounted ? `R${desiredLoan}` : "---"}</div>
                      </div>
                      <div className="h-px bg-gray-300 mt-2" />
                    </div>
                    <div className="flex flex-col">
                      <div className="text-base md:text-lg text-gray-700 mb-1 max-[480px]:text-sm">Debit Day</div>
                      <div className="h-12 md:h-14 flex items-end max-[480px]:h-10">
                        <div className="inline-flex items-end gap-1.5 text-4xl md:text-5xl font-normal text-persal-blue leading-none max-[480px]:text-3xl">
                          <span>{mounted ? ordinalLabel(REPAY_DAYS[selectedRepayIdx]) : "---"}</span>
                        </div>
                      </div>
                      <div className="h-px bg-gray-300 mt-2" />
                    </div>
                  </div>

                  <div className="mt-6 space-y-6 max-[480px]:mt-4 max-[480px]:space-y-5">
                    <div>
                      <div className="text-lg md:text-xl text-gray-700 mb-2 max-[480px]:text-base">How much do you need?</div>
                      <div className={`flex items-center gap-3 md:gap-4 max-[480px]:gap-2 transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                        <button
                          type="button"
                          onClick={() => updateDesiredLoan(Math.max(100, desiredLoan - 100))}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7"
                          aria-label="Decrease amount"
                        >
                          <svg className="w-4 h-4 max-[480px]:w-3.5 max-[480px]:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        <div className="relative flex-1 h-10 max-[480px]:h-9">
                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full" />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-persal-blue rounded-full" style={{ width: `${amountPercent}%` }} />
                          <input
                            id="desiredLoan"
                            type="range"
                            min={100}
                            max={5000}
                            step={100}
                            value={desiredLoan}
                            onChange={e => updateDesiredLoan(Number(e.target.value))}
                            onInput={e => updateDesiredLoan(Number((e.target as HTMLInputElement).value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-y"
                            style={{ touchAction: "pan-y" }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center pointer-events-none max-[480px]:w-8 max-[480px]:h-8"
                            style={{ left: `${amountKnobPercent}%` }}
                          >
                            <svg className="w-7 h-7 text-persal-blue max-[480px]:w-5.5 max-[480px]:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="10 8 6 12 10 16" />
                              <polyline points="14 8 18 12 14 16" />
                            </svg>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateDesiredLoan(Math.min(5000, desiredLoan + 100))}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7"
                          aria-label="Increase amount"
                        >
                          <svg className="w-4 h-4 max-[480px]:w-3.5 max-[480px]:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-lg md:text-xl text-gray-700 mb-2 max-[480px]:text-base">Monthly Repayment Day</div>
                      <div className={`flex items-center gap-3 md:gap-4 max-[480px]:gap-2 transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                        <button
                          type="button"
                          onClick={() => updateSelectedRepayIdx(selectedRepayIdx - 1)}
                          disabled={selectedRepayIdx === 0}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Previous repay day"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        <div className="relative flex-1 h-10">
                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full" />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-persal-blue rounded-full" style={{ width: `${(selectedRepayIdx / 4) * 100}%` }} />
                          <input
                            id="termDays"
                            type="range"
                            min={0}
                            max={4}
                            step={1}
                            value={selectedRepayIdx}
                            onChange={e => updateSelectedRepayIdx(Number(e.target.value))}
                            onInput={e => updateSelectedRepayIdx(Number((e.target as HTMLInputElement).value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-y"
                            style={{ touchAction: "pan-y" }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center pointer-events-none"
                            style={{ left: `${dayKnobPercent}%` }}
                          >
                            <svg className="w-7 h-7 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="10 8 6 12 10 16" />
                              <polyline points="14 8 18 12 14 16" />
                            </svg>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateSelectedRepayIdx(selectedRepayIdx + 1)}
                          disabled={selectedRepayIdx === 4}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Next repay day"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-3 md:gap-4" aria-hidden="true">
                        <div className="w-8" />
                        <div className="flex-1 grid grid-cols-5 text-[10px] md:text-[11px]">
                          {REPAY_DAYS.map((day, i) => (
                            <span key={day} className={`text-center ${i === selectedRepayIdx ? "text-persal-blue font-semibold" : "text-gray-500/50"}`}>{ordinalLabel(day)}</span>
                          ))}
                        </div>
                        <div className="w-8" />
                      </div>
                      <div className="mt-6 flex items-center gap-2 max-[480px]:gap-1.5">
                        {[1, 2, 3].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => updateSelectedMonth(m)}
                            className={`px-3 py-1.5 rounded-md border text-sm font-medium transition max-[480px]:text-xs max-[480px]:px-2.5 ${selectedMonth === m ? "bg-persal-blue text-white border-persal-blue" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                          >
                            {m} {m === 1 ? "Month" : "Months"}
                          </button>
                        ))}
                        {mounted && <span className="text-sm text-gray-500 max-[480px]:text-xs ml-1">{repayDateDisplay}</span>}
                      </div>
                      {mounted && (
                        <p className="mt-3 text-sm text-gray-600 max-[480px]:text-xs">
                          Repayment on the <span className="font-semibold text-persal-blue">{ordinalLabel(REPAY_DAYS[selectedRepayIdx])}</span> of every month for the next <span className="font-semibold text-persal-blue">{selectedMonth} {selectedMonth === 1 ? "month" : "months"}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {error && <div className="mt-4 text-red-600 font-semibold text-sm">{error}</div>}
                </div>

                <div className="bg-gray-200 px-4 md:px-6 py-4 md:py-7 grid grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-3 md:gap-4 items-center mt-auto border-t border-gray-300/70 md:min-h-[132px]">
                  <div className="flex flex-col items-center text-center">
                    <div className="text-sm md:text-lg text-persal-blue font-semibold leading-tight tracking-tight">R{monthlyRepayment.toFixed(2)}</div>
                    <div className="text-[10px] md:text-xs text-gray-700 leading-tight mt-1 font-medium">
                      <span className="md:hidden">Monthly</span>
                      <span className="hidden md:inline">Monthly repayment</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-sm md:text-lg text-gray-700 leading-tight tracking-tight">{repayDateLabelCompact}</div>
                    <div className="text-[10px] md:text-xs text-gray-700 leading-tight mt-1 font-medium">
                      <span className="md:hidden">Due date</span>
                      <span className="hidden md:inline">Final repayment date</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-sm md:text-lg text-gray-700 leading-tight tracking-tight inline-flex items-center gap-1">
                      <span>R{totalCost.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => setShowFeeBreakdown(true)}
                        className="text-orange-500 hover:text-orange-600"
                        aria-label="Open interest and fees breakdown"
                      >
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <line x1="12" y1="10" x2="12" y2="16" />
                          <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-700 leading-tight mt-1 font-medium">
                      <span className="md:hidden">Fees</span>
                      <span className="hidden md:inline">Interest & Fees</span>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-1 text-center md:text-right">
                    <Link
                      href={canApply ? applyNowHref : "#"}
                      onClick={handleApplyNowClick}
                      className={`inline-block px-4 py-2.5 rounded-lg font-semibold text-base transition text-center w-full md:w-auto ${canApply ? "bg-orange-500 text-white hover:bg-orange-600 cursor-pointer" : "bg-gray-300 text-gray-400 cursor-not-allowed pointer-events-none"}`}
                      title={hasActiveLoan ? "You have an active loan. Settle it before applying again." : undefined}
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-gray-100 p-6 text-center">
            <h2 className="text-3xl md:text-4xl text-gray-700">Flexible, short term loans that give you back control.</h2>
            <p className="mt-3 text-gray-600 text-[22px] md:text-base">
              Our <Link href="/how-it-works" className="text-persal-blue hover:underline">short term loans</Link> help people manage their cash flow. If you need a quick loan to tide you over for a short while, we&apos;re here for you. Our personal loan process is simple and easy to understand. To find out more, visit <Link href="/how-to-apply" className="text-persal-blue hover:underline">how it works.</Link>
            </p>
          </div>

          {hasActiveLoan && (
            <div className="mt-4 text-center">
              <Link
                href="/dashboard/lending/pay-now"
                className="inline-flex items-center justify-center rounded-lg bg-persal-blue px-4 py-2 text-base font-semibold text-white transition hover:bg-persal-dark"
                title="Open mock payment screen"
              >
                Monthly Repayments
              </Link>
            </div>
          )}
          </div>
          )}

          {activeMyLoanSection === "documents" && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 md:p-6">
              <h2 className="text-2xl md:text-3xl text-gray-800 font-normal mb-2">Loan documents</h2>
              <p className="text-gray-600 mb-6">All your loan records are available in one place.</p>

              <div className="flex flex-col gap-5">
                {/* Document 1 — Statement */}
                <Link href="/dashboard/lending/statement" className="flex items-start gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 hover:border-persal-blue hover:bg-teal-50/40 transition">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-persal-blue/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-gray-800">Statement</div>
                    <div className="mt-1 text-sm text-gray-600">View your points balance, previous loans, and your current active loan.</div>
                  </div>
                </Link>

                {/* Document 2 — Repayment Schedule */}
                <Link href="/dashboard/lending/schedule" className="flex items-start gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 hover:border-persal-blue hover:bg-teal-50/40 transition">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-persal-blue/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-gray-800">Repayment Schedule</div>
                    <div className="mt-1 text-sm text-gray-600">See your monthly deduction dates and current loan details.</div>
                  </div>
                </Link>

                {/* Document 3 — Loan History */}
                <Link href="/dashboard/lending/history" className="flex items-start gap-4 rounded-xl border border-gray-200 bg-gray-50 p-5 hover:border-persal-blue hover:bg-teal-50/40 transition">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-persal-blue/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-gray-800">Loan History</div>
                    <div className="mt-1 text-sm text-gray-600">Review your past loans and download previous loan statements.</div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {showFeeBreakdown && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-label="Fees Breakdown">
              <div className="w-full max-w-sm rounded-xl overflow-hidden bg-gray-100 shadow-2xl border border-gray-200">
                <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
                  <h3 className="font-semibold text-base">Fees Breakdown</h3>
                  <button
                    type="button"
                    onClick={() => setShowFeeBreakdown(false)}
                    className="text-white text-xl leading-none"
                    aria-label="Close fees breakdown"
                  >
                    ×
                  </button>
                </div>
                <div className="px-4 py-3 text-persal-blue font-semibold border-b border-gray-200">
                  R{monthlyRepayment.toFixed(2)} x {termMonths} monthly repayments
                </div>
                <div className="divide-y divide-gray-200 text-sm">
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Monthly repayments</span><span className="font-semibold text-gray-700">{termMonths} x R{monthlyRepayment.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Initiation fee</span><span className="font-semibold text-gray-700">R{initiationFee.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Service fee</span><span className="font-semibold text-gray-700">R{serviceFee.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Total fees</span><span className="font-semibold text-gray-700">R{totalFees.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Total interest</span><span className="font-semibold text-gray-700">R{totalInterest.toFixed(2)}</span></div>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-persal-blue font-semibold">
                  <span>Total to repay</span>
                  <span>R{totalRepayable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {showPendingLoanModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Pending application overwrite confirmation">
              <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl p-5">
                <h3 className="text-lg font-semibold text-slate-900">Ongoing Loan Application</h3>
                <p className="mt-2 text-sm text-slate-600">
                  You already have a pending loan application. If you continue, your previous pending application will be cancelled and replaced.
                </p>
                {overrideError && (
                  <p className="mt-2 text-sm text-red-600">{overrideError}</p>
                )}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (overrideSubmitting) return;
                      setShowPendingLoanModal(false);
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleOverwriteApplication}
                    disabled={overrideSubmitting}
                    className="px-3 py-2 rounded-lg bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                  >
                    {overrideSubmitting ? "Overriding..." : "Overwrite Application"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

export default function DashboardHomePage() {
  return (
    <Suspense>
      <DashboardHomeInner />
    </Suspense>
  );
}
