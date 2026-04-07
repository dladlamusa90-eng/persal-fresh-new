"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";

export default function DashboardHomePage() {
  const maxLoan = 5000;
  const [desiredLoan, setDesiredLoan] = useState(1500);
  const [selectedDays, setSelectedDays] = useState(60);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [error, setError] = useState("");
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const [activeMyLoanSection, setActiveMyLoanSection] = useState<"summary" | "documents">("summary");
  const [firstName, setFirstName] = useState("");
  const repayDateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/loans/me").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, loanData]) => {
        if (userData?.user?.fullName) {
          setFirstName(userData.user.fullName.trim().split(" ")[0]);
        }

        const status = loanData?.latestLoan?.status;
        // Pay Now is only for users with an active payable loan.
        setHasActiveLoan(status === "APPROVED");
      })
      .catch(() => {});
  }, []);

  function updateDesiredLoan(value: number) {
    if (value < 100 || value > maxLoan) {
      setError("Loan amount must be between R100 and R5,000.");
    } else {
      setError("");
    }
    setDesiredLoan(value);
  }

  const termDays = Math.max(6, Math.min(90, selectedDays));
  const term = Math.max(1, Math.min(3, Math.ceil(termDays / 30)));
  const interest1 = desiredLoan * 0.05;
  const interest2 = term >= 2 ? desiredLoan * 0.03 : 0;
  const interest3 = term === 3 ? desiredLoan * 0.02 : 0;

  let initiationFee = 0;
  if (desiredLoan <= 1000) {
    initiationFee = 150;
  } else if (desiredLoan <= 1500) {
    initiationFee = 200;
  } else {
    initiationFee = 300;
  }

  const serviceFee = 60;
  const totalCost = interest1 + interest2 + interest3 + initiationFee + serviceFee;
  const totalRepayable = desiredLoan + totalCost;
  const totalInterest = interest1 + interest2 + interest3;
  const totalFees = initiationFee + serviceFee;
  const amountPercent = ((desiredLoan - 100) / (5000 - 100)) * 100;
  const dayPercent = ((termDays - 6) / (90 - 6)) * 100;
  const amountKnobPercent = Math.min(97, Math.max(3, amountPercent));
  const dayKnobPercent = Math.min(97, Math.max(3, dayPercent));
  const canApply = !hasActiveLoan && !error && desiredLoan >= 100 && desiredLoan <= maxLoan;

  const repayDate = new Date();
  repayDate.setDate(repayDate.getDate() + termDays);
  const repayDateLabel = repayDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const repayDateISO = repayDate.toISOString().split("T")[0];
  const repayDateDisplay = repayDateISO.replace(/-/g, "/");
  const repayDateLabelCompact = repayDateLabel.replace(/\s+/g, "");

  function setDaysFromRepayDate(value: string) {
    if (!value) return;
    const selected = new Date(`${value}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rawDays = Math.ceil((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const clampedDays = Math.max(6, Math.min(90, rawDays));
    setSelectedDays(clampedDays);
  }

  return (
    <section className="max-w-6xl mx-auto px-2 md:px-4 -mt-6 md:-mt-10">
      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6 md:gap-8">
        <aside className="pt-2">
          <nav className="space-y-3 text-[22px] md:text-base">
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

        <div className="pb-8">
          <h1 className="text-4xl md:text-[42px] text-gray-800 font-normal mb-4">Hi {firstName || "there"}</h1>

          <div className="mb-4">
            <div className="w-full rounded-xl bg-gray-100 px-5 py-3 text-gray-700 text-lg md:text-base flex items-center justify-center gap-2">
              <Lightbulb size={18} className="text-persal-blue" />
              <span>You can apply for up to <b>R 5000</b></span>
            </div>
          </div>

          {activeMyLoanSection === "summary" && (
          <>
          <div id="calc" className="bg-white rounded-2xl shadow-[0_-10px_18px_-16px_rgba(2,12,27,0.35),0_22px_42px_-22px_rgba(2,12,27,0.58),0_10px_18px_-14px_rgba(2,12,27,0.35)] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12">
              <aside className="md:col-span-4 bg-persal-dark text-white">
                <div className="p-4 md:p-5 border-b border-white/20">
                  <h3 className="text-orange-300 font-semibold text-lg mb-2">What you can get</h3>
                  <p className="text-white/95 leading-relaxed text-sm md:text-base font-semibold break-words">
                    New customers can apply for up to <b>R2500</b>, while existing customers can apply for up to <b>R5000</b>, with up to 3 months to repay.
                  </p>
                </div>
                <div className="p-4 md:p-5 border-b border-white/20 bg-teal-900/25">
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
                      <span>Bank account details</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" />
                      </svg>
                      <span>Most recent proof of income</span>
                    </li>
                  </ul>
                </div>
                <div className="p-4 md:p-5">
                  <h3 className="text-orange-300 font-semibold text-lg mb-2">How to apply</h3>
                  <ol className="space-y-2 text-sm md:text-base text-white/95 break-words">
                    <li><span className="text-orange-300 mr-2 font-bold">1</span>Choose the amount you need</li>
                    <li><span className="text-orange-300 mr-2 font-bold">2</span>Choose how long you will need to repay</li>
                    <li><span className="text-orange-300 mr-2 font-bold">3</span>Click <span className="font-bold">"Apply Now"</span> and proceed to finalise your loan</li>
                  </ol>
                </div>
              </aside>

              <div className="md:col-span-8 bg-gray-50 flex flex-col h-full">
                <div className="p-4 md:p-6 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-end">
                    <div className="flex flex-col">
                      <div className="text-base md:text-lg text-gray-700 mb-1">Loan Amount</div>
                      <div className="h-12 md:h-14 flex items-end">
                        <div className="text-4xl md:text-5xl font-normal text-persal-blue leading-none">R{desiredLoan}</div>
                      </div>
                      <div className="h-px bg-gray-300 mt-2" />
                    </div>
                    <div className="flex flex-col">
                      <div className="text-base md:text-lg text-gray-700 mb-1">Loan Period</div>
                      <div className="h-12 md:h-14 flex items-end">
                        <div className="inline-flex items-end gap-1.5 text-4xl md:text-5xl font-normal text-persal-blue leading-none">
                          <span>{termDays}</span>
                          <span className="text-xl md:text-2xl text-gray-700 font-normal leading-none">days</span>
                        </div>
                      </div>
                      <div className="h-px bg-gray-300 mt-2" />
                    </div>
                  </div>

                  <div className="mt-16 space-y-6">
                    <div>
                      <div className="text-lg md:text-xl text-gray-700 mb-2">How much do you need?</div>
                      <div className="flex items-center gap-3 md:gap-4">
                        <button
                          type="button"
                          onClick={() => updateDesiredLoan(Math.max(100, desiredLoan - 100))}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0"
                          aria-label="Decrease amount"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        <div className="relative flex-1 h-10">
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
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center pointer-events-none"
                            style={{ left: `${amountKnobPercent}%` }}
                          >
                            <svg className="w-7 h-7 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="10 8 6 12 10 16" />
                              <polyline points="14 8 18 12 14 16" />
                            </svg>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateDesiredLoan(Math.min(5000, desiredLoan + 100))}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0"
                          aria-label="Increase amount"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-lg md:text-xl text-gray-700 mb-2">Over how many days?</div>
                      <div className="mb-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (repayDateInputRef.current && "showPicker" in repayDateInputRef.current) {
                              (repayDateInputRef.current as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                            } else {
                              repayDateInputRef.current?.focus();
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm inline-flex items-center gap-2 hover:bg-gray-50 transition"
                          aria-label="Set repayment date"
                        >
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="5" width="18" height="16" rx="2" />
                            <line x1="16" y1="3" x2="16" y2="7" />
                            <line x1="8" y1="3" x2="8" y2="7" />
                            <line x1="3" y1="11" x2="21" y2="11" />
                          </svg>
                          <span>{repayDateDisplay}</span>
                        </button>
                        <span className="text-sm text-gray-600">Choose repayment date</span>
                        <input
                          ref={repayDateInputRef}
                          type="date"
                          min={new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                          max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                          value={repayDateISO}
                          onChange={e => setDaysFromRepayDate(e.target.value)}
                          onClick={e => {
                            const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                            input.showPicker?.();
                          }}
                          className="sr-only"
                        />
                      </div>
                      <div className="flex items-center gap-3 md:gap-4">
                        <button
                          type="button"
                          onClick={() => setSelectedDays(Math.max(6, termDays - 1))}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0"
                          aria-label="Decrease period"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        <div className="relative flex-1 h-10">
                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex gap-1.5">
                            <div className="relative h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="absolute left-0 top-0 h-full bg-persal-blue rounded-full"
                                style={{ width: `${termDays <= 6 ? 0 : termDays >= 30 ? 100 : ((termDays - 6) / 24) * 100}%` }}
                              />
                            </div>
                            <div className="relative h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="absolute left-0 top-0 h-full bg-persal-blue rounded-full"
                                style={{ width: `${termDays <= 30 ? 0 : termDays >= 60 ? 100 : ((termDays - 30) / 30) * 100}%` }}
                              />
                            </div>
                            <div className="relative h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="absolute left-0 top-0 h-full bg-persal-blue rounded-full"
                                style={{ width: `${termDays <= 60 ? 0 : termDays >= 90 ? 100 : ((termDays - 60) / 30) * 100}%` }}
                              />
                            </div>
                          </div>
                          <input
                            id="termDays"
                            type="range"
                            min={6}
                            max={90}
                            step={1}
                            value={termDays}
                            onChange={e => setSelectedDays(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
                          onClick={() => setSelectedDays(Math.min(90, termDays + 1))}
                          className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0"
                          aria-label="Increase period"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-3 md:gap-4" aria-hidden="true">
                        <div className="w-8" />
                        <div className="flex-1 grid grid-cols-3 text-[10px] md:text-[11px] text-gray-500/50">
                          <span className="text-center">1st Month</span>
                          <span className="text-center">2nd Month</span>
                          <span className="text-center">3rd Month</span>
                        </div>
                        <div className="w-8" />
                      </div>
                    </div>
                  </div>

                  {error && <div className="mt-4 text-red-600 font-semibold text-sm">{error}</div>}
                </div>

                <div className="bg-gray-200 px-4 md:px-6 py-6 md:py-7 grid grid-cols-1 md:grid-cols-4 gap-4 items-center mt-auto border-t border-gray-300/70 min-h-[132px]">
                  <div className="flex flex-col items-center text-center">
                    <div className="text-base md:text-lg text-persal-blue font-semibold leading-tight tracking-tight">R{totalRepayable.toFixed(2)}</div>
                    <div className="text-xs text-gray-700 leading-tight mt-1 font-medium">1 x Installment</div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-base md:text-lg text-gray-700 leading-tight tracking-tight">{repayDateLabelCompact}</div>
                    <div className="text-xs text-gray-700 leading-tight mt-1 font-medium">Repay date</div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-base md:text-lg text-gray-700 leading-tight tracking-tight inline-flex items-center gap-1">
                      <span>R{totalCost.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => setShowFeeBreakdown(true)}
                        className="text-orange-500 hover:text-orange-600"
                        aria-label="Open interest and fees breakdown"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <line x1="12" y1="10" x2="12" y2="16" />
                          <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-700 leading-tight mt-1 font-medium">Interest & Fees</div>
                  </div>
                  <div className="text-center md:text-right">
                    <Link
                      href={canApply ? `/dashboard/lending/verify-number?loan=${desiredLoan}&term=${term}&termDays=${termDays}` : "#"}
                      className={`inline-block px-4 py-2 rounded-lg font-semibold text-base transition text-center ${canApply ? "bg-orange-500 text-white hover:bg-orange-600 cursor-pointer" : "bg-gray-300 text-gray-400 cursor-not-allowed pointer-events-none"}`}
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
                Pay Now
              </Link>
            </div>
          )}
          </>
          )}

          {activeMyLoanSection === "documents" && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 md:p-6">
              <h2 className="text-2xl md:text-3xl text-gray-800 font-normal mb-2">Loan documents</h2>
              <p className="text-gray-600 mb-6">All your loan records are available in one place.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/dashboard/lending/active-loan" className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-persal-blue hover:bg-teal-50/40 transition">
                  <div className="text-lg text-gray-800">Active Loan</div>
                  <div className="mt-1 text-sm text-gray-600">View your current active loan details.</div>
                </Link>

                <Link href="/dashboard/lending/application-status" className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-persal-blue hover:bg-teal-50/40 transition">
                  <div className="text-lg text-gray-800">Status</div>
                  <div className="mt-1 text-sm text-gray-600">Check the latest application status.</div>
                </Link>

                <Link href="/dashboard/lending/schedule" className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-persal-blue hover:bg-teal-50/40 transition">
                  <div className="text-lg text-gray-800">Schedule</div>
                  <div className="mt-1 text-sm text-gray-600">See your repayment schedule and due dates.</div>
                </Link>

                <Link href="/dashboard/lending/statement" className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-persal-blue hover:bg-teal-50/40 transition">
                  <div className="text-lg text-gray-800">Statement</div>
                  <div className="mt-1 text-sm text-gray-600">Open your latest loan statements.</div>
                </Link>

                <Link href="/dashboard/lending/history" className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-persal-blue hover:bg-teal-50/40 transition md:col-span-2">
                  <div className="text-lg text-gray-800">Loan History</div>
                  <div className="mt-1 text-sm text-gray-600">Review your previous loans and activity.</div>
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
                  R{totalRepayable.toFixed(2)} on {repayDateLabelCompact}
                </div>
                <div className="divide-y divide-gray-200 text-sm">
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Initiation fee</span><span className="font-semibold text-gray-700">R{initiationFee.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Service fees</span><span className="font-semibold text-gray-700">R{serviceFee.toFixed(2)}</span></div>
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

        </div>
      </div>
    </section>
  );
}
