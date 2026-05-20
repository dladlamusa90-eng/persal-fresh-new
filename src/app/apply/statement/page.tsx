"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoanApplicationStatementPage() {
  const router = useRouter();

  // Retrieve draft from sessionStorage (guest) or API (logged-in)
  let draft: any = null;
  if (typeof window !== "undefined") {
    const raw = sessionStorage.getItem("guestLoanApplyDraft");
    if (raw) draft = JSON.parse(raw);
  }

  if (!draft) {
    // If no draft, redirect to application start
    if (typeof window !== "undefined") router.replace("/apply");
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
        <div className="flex w-full max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Persal" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: "100px", height: "100px" }} />
          </a>
          <nav className="flex gap-4 items-center">
            <Link
              href="/auth/login"
              className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition"
            >
              LogIn
            </Link>
            <Link href="/auth/signup?from=apply" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">
              SignUp
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6 text-persal-dark">Loan Application Statement</h1>
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Application Breakdown</h2>
        <ul className="text-gray-700 text-base space-y-2">
          <li><strong>Full Name:</strong> {draft.fullName}</li>
          <li><strong>Email:</strong> {draft.email}</li>
          <li><strong>Phone:</strong> {draft.phone}</li>
          <li><strong>SA ID Number:</strong> {draft.idNumber}</li>
          <li><strong>Persal Number:</strong> {draft.persalNumber}</li>
          <li><strong>Gross Salary:</strong> R{draft.grossSalary}</li>
          <li><strong>Disposable Income:</strong> R{draft.disposableIncome}</li>
          <li><strong>Loan Amount:</strong> R{draft.amount}</li>
          <li><strong>Term (days):</strong> {draft.termDays}</li>
          <li><strong>Bank:</strong> {draft.bankName}</li>
          <li><strong>Account Number:</strong> {draft.accountNumber}</li>
          <li><strong>Branch Code:</strong> {draft.branchCode}</li>
        </ul>
      </div>
      <button
        className="w-full bg-persal-blue hover:bg-persal-dark text-white font-bold py-4 rounded-xl text-base shadow-lg transition mb-4"
        onClick={() => router.push("/apply/face-verification")}
      >
        Next: Face Verification
      </button>
      </main>
    </div>
  );
}
