"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

function calculateMaxLoan(salary: number, disposable: number) {
  if (salary < 2000 || disposable < 500) return 0;
  const minCap = 500;
  const maxCap = 2000;
  const scaled = minCap + ((salary - 2000) / (10000 - 2000)) * (maxCap - minCap);
  return Math.floor(Math.min(disposable, scaled) / 100) * 100;
}

function calculateMonthlyRepayment(maxLoan: number) {
  // Example: 12 months, 18% interest
  const months = 12;
  const interest = 0.18;
  if (maxLoan === 0) return 0;
  const total = maxLoan * (1 + interest);
  return Math.round(total / months);
}

export default function HomeLoanPreview() {
  const [salary, setSalary] = useState(0);
  const [disposable, setDisposable] = useState(0);
  const router = useRouter();

  const maxLoan = calculateMaxLoan(salary, disposable);
  const monthly = calculateMonthlyRepayment(maxLoan);

  return (
    <section className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow p-8 flex flex-col gap-6 items-center mt-8">
      <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Loan Preview</h2>
      <form className="flex flex-col gap-4 w-full max-w-md" onSubmit={e => e.preventDefault()}>
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary (R)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={salary || ""}
              onChange={e => setSalary(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-700"
              placeholder="e.g. 25000"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Disposable Income (R)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={disposable || ""}
              onChange={e => setDisposable(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-700"
              placeholder="e.g. 8000"
            />
          </div>
        </div>
      </form>
      <div className="flex flex-col md:flex-row gap-8 w-full justify-between items-center mt-2">
        <div className="flex flex-col items-center flex-1">
          <span className="text-gray-500 text-xs">Estimated Max Loan</span>
            <span className="text-2xl font-bold text-blue-700">R 5000</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-gray-500 text-xs">Est. Monthly Repayment</span>
            <span className="text-2xl font-bold text-blue-700">R {calculateMonthlyRepayment(5000).toLocaleString()}</span>
        </div>
      </div>
      <button
        className="mt-6 px-8 py-3 bg-blue-700 text-white rounded-lg font-semibold text-lg hover:bg-blue-800 transition w-full max-w-xs"
        onClick={() => router.push("/auth/login")}
        type="button"
      >
        Apply Now
      </button>
    </section>
  );
}
