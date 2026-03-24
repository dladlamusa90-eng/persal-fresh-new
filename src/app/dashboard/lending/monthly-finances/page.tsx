"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MonthlyFinancesPage() {
  const router = useRouter();
  const [grossIncome, setGrossIncome] = useState("7500");
  const [netIncome, setNetIncome] = useState("6000");
  const [creditRepayments, setCreditRepayments] = useState("1000");
  const [livingExpenses, setLivingExpenses] = useState("2500");

  const disposable =
    (parseInt(netIncome || "0", 10) || 0) -
    (parseInt(creditRepayments || "0", 10) || 0) -
    (parseInt(livingExpenses || "0", 10) || 0);

  function handleNext() {
    router.push("/dashboard/lending/apply");
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">65 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[65%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-8">Monthly Finances</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:items-start">

          {/* Gross monthly income */}
          <label className="text-sm font-medium text-gray-700 md:pt-3">Gross monthly income</label>
          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R</span>
              <input
                type="text"
                inputMode="numeric"
                value={grossIncome}
                onChange={e => setGrossIncome(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-gray-100 border border-transparent pl-9 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
              />
            </div>
          </div>

          {/* Nett monthly income */}
          <label className="text-sm font-medium text-gray-700 md:pt-3">Nett monthly income</label>
          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R</span>
              <input
                type="text"
                inputMode="numeric"
                value={netIncome}
                onChange={e => setNetIncome(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-gray-100 border border-transparent pl-9 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
              />
            </div>
            <p className="mt-2 text-sm italic text-gray-500">*Your salary amount <em>paid into your bank account</em></p>
          </div>

          {/* Monthly credit repayments */}
          <label className="text-sm font-medium text-gray-700 md:pt-3">Monthly credit repayments</label>
          <div>
            <div className="relative">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R</span>
              <input
                type="text"
                inputMode="numeric"
                value={creditRepayments}
                onChange={e => setCreditRepayments(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
              />
            </div>
            <p className="mt-2 text-sm italic text-gray-500">These expenses could include debt obligations like car, bond or credit card repayments.</p>
          </div>

          {/* Monthly living expenses */}
          <label className="text-sm font-medium text-gray-700 md:pt-3">Monthly living expenses</label>
          <div>
            <div className="relative">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R</span>
              <input
                type="text"
                inputMode="numeric"
                value={livingExpenses}
                onChange={e => setLivingExpenses(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
              />
            </div>
            <p className="mt-2 text-sm italic text-gray-500">These expenses could include rent, groceries, petrol, school fees etc.</p>
          </div>

          {/* Calculated disposable income */}
          <label className="text-sm font-medium text-gray-700 md:pt-1">Calculated disposable income</label>
          <div className="text-lg font-semibold text-persal-dark">
            R {disposable.toLocaleString("en-ZA")}
          </div>

        </div>

        <div className="mt-10 flex justify-between">
          <button
            type="button"
            onClick={() => router.push("/dashboard/lending/employment-details")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#f5912d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#eb8621]"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
