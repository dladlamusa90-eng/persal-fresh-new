import React from "react";

export default function AgreementPage({ params }: { params: { id: string } }) {
  return (
    <section className="max-w-2xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Loan Agreement</h2>
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col gap-4">
        <div className="mb-4">
          <span className="text-gray-500 text-xs">Agreement ID</span>
          <span className="text-lg font-bold text-gray-900 ml-2">{params.id}</span>
        </div>
        <div className="mb-4">
          <span className="text-gray-500 text-xs">Borrower</span>
          <span className="text-lg font-bold text-gray-900 ml-2">Thabo Mokoena</span>
        </div>
        <div className="mb-4">
          <span className="text-gray-500 text-xs">Loan Amount</span>
          <span className="text-lg font-bold text-gray-900 ml-2">As approved (up to R2,500 first-time / R5,000 returning)</span>
        </div>
        <div className="mb-4">
          <span className="text-gray-500 text-xs">Term</span>
          <span className="text-lg font-bold text-gray-900 ml-2">Up to 3 months (30/60/90 days)</span>
        </div>
        <div className="mb-4">
          <span className="text-gray-500 text-xs">Repayment</span>
          <span className="text-lg font-bold text-gray-900 ml-2">Money is withdrawn once at the end of the selected period.</span>
        </div>
        <div className="mb-4">
          <span className="text-gray-500 text-xs">Repayment Schedule</span>
          <ul className="list-disc list-inside text-gray-700 text-sm mt-2">
            <li>Single deduction date = loan start date + selected term</li>
          </ul>
        </div>
        <button className="mt-4 px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition">Download Agreement</button>
      </div>
    </section>
  );
}
