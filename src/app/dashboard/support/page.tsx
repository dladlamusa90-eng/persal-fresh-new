"use client";
import React from "react";

const mockFAQ = [
  { q: "How do I apply for a loan?", a: "Go to 'Apply for Loan' and fill out the form." },
  { q: "How are repayments deducted?", a: "Repayments are payroll-linked and deducted automatically." },
];

export default function SupportPage() {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8 border border-gray-200">
      <h2 className="text-xl font-bold text-persal-blue mb-6">Support & FAQ</h2>
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-persal-blue mb-4">Frequently Asked Questions</h3>
        <ul className="space-y-4">
          {mockFAQ.map((f, i) => (
            <li key={i}>
              <div className="font-medium text-persal-dark mb-1">{f.q}</div>
              <div className="text-gray-600 text-sm">{f.a}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-8">
        <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3 font-semibold text-lg shadow transition w-full mb-2">Contact Support</button>
        <div className="text-sm text-gray-600">Email: support@persal.co.za</div>
        <div className="text-sm text-gray-600">WhatsApp: +27 82 123 4567</div>
      </div>
    </div>
  );
}
