"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PendingLoanRow = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  persalNumber: string;
  amount: number;
  termDays: number;
  createdAt: string;
};

type Props = {
  loans: PendingLoanRow[];
};

export default function PendingApplicationsTable({ loans }: Props) {
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const filteredLoans = useMemo(() => {
    const min = minAmount.trim() === "" ? null : Number(minAmount);
    const max = maxAmount.trim() === "" ? null : Number(maxAmount);

    return loans.filter((loan) => {
      if (min !== null && !Number.isNaN(min) && loan.amount < min) return false;
      if (max !== null && !Number.isNaN(max) && loan.amount > max) return false;
      return true;
    });
  }, [loans, maxAmount, minAmount]);

  return (
    <>
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50/60">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Filter By Loan Amount</p>
        <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Min Amount</span>
            <input
              type="number"
              min={0}
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="e.g. 500"
              className="w-full sm:w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Max Amount</span>
            <input
              type="number"
              min={0}
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="e.g. 3000"
              className="w-full sm:w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setMinAmount("");
              setMaxAmount("");
            }}
            className="sm:ml-1 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear Filter
          </button>

          <p className="sm:ml-auto text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredLoans.length}</span> of {" "}
            <span className="font-semibold text-slate-900">{loans.length}</span>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="px-4 py-3 font-semibold">Applicant</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Persal Number</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Term</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No pending applications in this amount range.
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => (
                <tr key={loan.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{loan.applicantName}</td>
                  <td className="px-4 py-3 text-slate-700">{loan.applicantEmail}</td>
                  <td className="px-4 py-3 text-slate-700">{loan.persalNumber}</td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">
                    R {new Intl.NumberFormat("en-US").format(Math.round(loan.amount))}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{loan.termDays} days</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(loan.createdAt).toLocaleDateString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/loans/${loan.id}`}
                      className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View Application
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
