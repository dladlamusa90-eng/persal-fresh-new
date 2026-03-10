"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function ApplyPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-8 border border-gray-200">
      <h2 className="text-xl font-bold text-persal-blue mb-6">Apply for Loan</h2>
      {/* Loan calculator card */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-persal-dark mb-2">Loan Amount</label>
        <input type="range" min="500" max="5000" step="100" className="w-full" />
        <div className="flex justify-between text-xs text-persal-dark mt-1">
          <span>R500</span>
          <span>R2,500 (First-time) / R5,000 (Returning)</span>
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-persal-dark mb-2">Term</label>
        <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          <option>1 month</option>
          <option>2 months</option>
          <option>3 months</option>
        </select>
        <p className="text-xs text-gray-500 mt-2">Money is withdrawn once, at the end of your selected period.</p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/auth/login")}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 font-semibold text-lg shadow transition w-full"
      >
        Apply
      </button>
    </div>
  );
}
