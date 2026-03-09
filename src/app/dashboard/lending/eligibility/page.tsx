"use client";
import React, { useEffect, useState } from "react";
import {
  FIRST_TIME_MAX_LOAN,
  RETURNING_MAX_LOAN,
  calculateLoanCharges,
  calculateLogicalMaxLoan,
  getMaxLoanForUser,
} from "@/lib/loanPolicy";

export default function EligibilityPage() {
  const [salary, setSalary] = useState(5000);
  const [disposable, setDisposable] = useState(2500);
  const [maxLoan, setMaxLoan] = useState(0);
  const [desiredLoan, setDesiredLoan] = useState(0);
  const [term, setTerm] = useState(3);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState("");
  const [isReturningUser, setIsReturningUser] = useState(false);

  const userLoanCap = getMaxLoanForUser(isReturningUser);

  useEffect(() => {
    let mounted = true;

    async function loadUserType() {
      try {
        const response = await fetch("/api/loans/me", { cache: "no-store" });
        if (!response.ok || !mounted) return;

        const body = (await response.json()) as { isReturningUser?: boolean };
        setIsReturningUser(Boolean(body.isReturningUser));
      } catch {
        return;
      }
    }

    loadUserType();
    return () => {
      mounted = false;
    };
  }, []);

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    if (disposable > salary) {
      setError("Disposable income cannot be more than gross salary.");
      setCalculated(false);
      return;
    }
    let max = Math.max(0, calculateLogicalMaxLoan(salary, disposable, userLoanCap));
    // Round to nearest 100
    max = Math.round(max / 100) * 100;
    setMaxLoan(max);
    setDesiredLoan(max);
    setError("");
    setCalculated(true);
    setTerm(3);
  }



  // --- FORMULA BASED ON EXAMPLES ---
  const { interestMonth1, interestMonth2, interestMonth3, initiationFee, serviceFee, totalCost, totalRepayable } =
    calculateLoanCharges(desiredLoan, term * 30);

  return (
    <section className="max-w-2xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Loan Eligibility</h2>
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
        First-time users: <b>up to R{FIRST_TIME_MAX_LOAN.toLocaleString()}</b> | Returning users: <b>up to R{RETURNING_MAX_LOAN.toLocaleString()}</b>.
        Your profile: <b>{isReturningUser ? "Returning" : "First-time"}</b>.
      </div>
      <form onSubmit={handleCalculate} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <span className="text-gray-500 text-xs">Gross Salary</span>
            <input
              type="number"
              min={0}
              value={salary}
              onChange={e => setSalary(Number(e.target.value))}
              className="w-full border rounded p-2 mt-2 text-lg font-bold text-gray-900"
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
            />
          </div>
        </div>
        <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">Calculate</button>
      </form>
      {error && <div className="mt-4 text-red-600 font-semibold text-sm">{error}</div>}
      {calculated && !error && (
        <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200 flex flex-col gap-6">
          <div className="text-lg font-semibold text-gray-900">Maximum Loan Amount: <span className="text-blue-700">R {maxLoan.toLocaleString()}</span></div>
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
              disabled={maxLoan < 100}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>R 100</span>
              <span>R {maxLoan.toLocaleString()}</span>
            </div>
            <div className="mt-2 text-lg font-semibold">R {desiredLoan.toLocaleString()}</div>
            {maxLoan < 100 && (
              <div className="text-red-600 text-sm mt-2">Your salary and disposable income are too low for a loan.</div>
            )}
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Select Term</label>
            <select value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full border rounded p-2">
              <option value={1}>1 Month (full repayment with interest)</option>
              <option value={2}>2 Months (full payment at term end)</option>
              <option value={3}>3 Months (full payment at term end)</option>
            </select>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col gap-2">
            <span className="text-gray-500 text-xs">Breakdown</span>
            <div className="flex justify-between text-sm">
              <span>Loan Amount</span>
              <span>R {desiredLoan.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Interest (Month 1, 5%)</span>
              <span>R {interestMonth1.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
            </div>
            {term >= 2 && (
              <div className="flex justify-between text-sm">
                <span>Interest (Month 2, 3%)</span>
                <span>R {interestMonth2.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
              </div>
            )}
            {term === 3 && (
              <div className="flex justify-between text-sm">
                <span>Interest (Month 3, 2%)</span>
                <span>R {interestMonth3.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Initiation Fee</span>
              <span>R {initiationFee.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Service Fee (once-off)</span>
              <span>R {serviceFee.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-2">
              <span>Total Cost (Interest + Fees)</span>
              <span>R {totalCost.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
            </div>
            <div className="flex justify-between text-base font-bold mt-2">
              <span>Total Repayable (deducted at end)</span>
              <span>R {totalRepayable.toLocaleString()}</span>
            </div>
            <span className="text-xs text-gray-500 mt-2">Money is withdrawn once, at the end of your selected period.</span>
          </div>
        </div>
      )}
      <div className="flex justify-end mt-8">
        <a
          href={calculated && !error ? `/dashboard/lending/apply?salary=${salary}&disposable=${disposable}&loan=${desiredLoan}&term=${term}` : undefined}
          className={`px-8 py-3 rounded-xl font-semibold text-lg transition 
            ${calculated && !error ? "bg-blue-700 text-white hover:bg-blue-800 cursor-pointer" : "bg-gray-300 text-gray-400 cursor-not-allowed"}`}
          tabIndex={calculated && !error ? 0 : -1}
          aria-disabled={!calculated || !!error}
          onClick={e => { if (!calculated || error) e.preventDefault(); }}
        >
          Apply Now
        </a>
      </div>
    </section>
  );
}
