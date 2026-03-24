"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const employmentOptions = ["Employed", "Self-employed", "Retired/Pensioner", "Grant recipient", "Unemployed"];
const incomeFrequencyOptions = ["Monthly", "Weekly", "Fortnightly"];

export default function EmploymentDetailsPage() {
  const router = useRouter();
  const [employmentStatus, setEmploymentStatus] = useState("Employed");
  const [grossIncome, setGrossIncome] = useState("7500");
  const [netIncome, setNetIncome] = useState("6000");
  const [incomeFrequency, setIncomeFrequency] = useState("Monthly");
  const [salaryDay, setSalaryDay] = useState("25");
  const [showPepInfo, setShowPepInfo] = useState(false);
  const [pepAnswer, setPepAnswer] = useState<"yes" | "no">("no");

  function handleNext() {
    router.push("/dashboard/lending/apply");
  }

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
      <div className="rounded-2xl bg-white px-6 py-6 md:px-8 md:py-8 shadow-sm">
        <div className="mb-6">
          <div className="text-sm font-medium text-persal-dark tracking-tight">50 %</div>
          <div className="mt-2 h-1 w-full rounded-full bg-gray-300 overflow-hidden">
            <div className="h-full w-[50%] bg-lime-500" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-normal text-persal-dark mb-8">Employment details</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[350px_minmax(0,1fr)] md:items-center">
          <label className="text-sm font-medium text-gray-700">Employment status</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={employmentStatus}
              onChange={e => setEmploymentStatus(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue"
            >
              {employmentOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <label className="text-sm font-medium text-gray-700">Gross monthly income (before tax &amp; deductions)</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 text-sm">R</span>
            <input
              type="text"
              inputMode="numeric"
              value={grossIncome}
              onChange={e => setGrossIncome(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
            />
          </div>

          <label className="text-sm font-medium text-gray-700">Net monthly income (after tax &amp; deductions)</label>
          <div>
            <div className="relative">
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 text-sm">R</span>
              <input
                type="text"
                inputMode="numeric"
                value={netIncome}
                onChange={e => setNetIncome(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border border-gray-200 bg-white pl-12 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
              />
            </div>
            <p className="mt-2 text-sm italic text-gray-500">*Your salary amount paid into your bank account</p>
          </div>

          <label className="text-sm font-medium text-gray-700">Frequency of income</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <select
              value={incomeFrequency}
              onChange={e => setIncomeFrequency(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-10 py-3 text-sm text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-persal-blue"
            >
              {incomeFrequencyOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-persal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <label className="text-sm font-medium text-gray-700">Salary day</label>
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-lime-500" />
            <input
              type="text"
              inputMode="numeric"
              value={salaryDay}
              onChange={e => setSalaryDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
            />
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm md:text-base text-gray-700 leading-snug">
            Are you, or anyone you&apos;re associated with, a{" "}
            <span className="text-sky-500">Politically Exposed Person?</span>{" "}
            <button
              type="button"
              onClick={() => setShowPepInfo(true)}
              aria-label="What is a Politically Exposed Person"
              className="inline-flex items-center text-orange-500 hover:text-orange-600 align-middle"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="10" x2="12" y2="16" />
                <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </p>

          <div className="mt-4 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pepAnswer"
                value="yes"
                checked={pepAnswer === "yes"}
                onChange={() => setPepAnswer("yes")}
                className="w-4 h-4 accent-persal-blue cursor-pointer"
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pepAnswer"
                value="no"
                checked={pepAnswer === "no"}
                onChange={() => setPepAnswer("no")}
                className="w-4 h-4 accent-persal-blue cursor-pointer"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex min-w-[250px] items-center justify-center rounded-xl bg-[#f5912d] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#eb8621]"
          >
            Next
          </button>
        </div>
      </div>

      {showPepInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-label="What is a Politically Exposed Person">
          <div className="w-full max-w-sm rounded-xl overflow-hidden bg-gray-100 shadow-2xl border border-gray-200">
            <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
              <h3 className="font-semibold text-base">What is this?</h3>
              <button
                type="button"
                onClick={() => setShowPepInfo(false)}
                className="text-white text-xl leading-none"
                aria-label="Close PEP info"
              >
                ×
              </button>
            </div>
            <div className="px-4 py-4 text-sm leading-snug text-gray-700">
              A PEP is any individual who holds or has in the past held a position of public trust, such as government officials, important political party officials, etc. It is not always limited to these individuals but also includes their immediate family members & close business associates. Prominent Influential Persons (PIPs) includes the likes of local influencers, such as religious leaders or chiefs of provinces.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
