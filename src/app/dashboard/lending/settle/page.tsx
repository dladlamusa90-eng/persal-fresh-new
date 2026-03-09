import React from "react";

export default function SettlePage() {
  return (
    <section className="max-w-xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Settle Loan</h2>
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Remaining Principal</span>
          <span className="text-lg font-bold text-gray-900">R 7,500</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs">Settlement Amount</span>
          <span className="text-lg font-bold text-gray-900">R 7,800</span>
        </div>
        <button className="mt-4 px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition">Generate Settlement Letter</button>
      </div>
    </section>
  );
}
