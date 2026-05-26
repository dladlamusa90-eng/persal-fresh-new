"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateLoanCharges, getTermMonths } from "@/lib/loanPolicy";

type UploadedDocument = { name: string; type: string; size: number; dataUrl: string };

type Draft = {
  fullName: string;
  email: string;
  phone: string;
  idNumber: string;
  persalNumber: string;
  grossSalary: number;
  disposableIncome: number;
  amount: number;
  termDays: number;
  bankName: string;
  accountNumber: string;
  accountType: string;
  branchCode: string;
  bankStatementDocument?: UploadedDocument;
  guestIdFront?: UploadedDocument;
  debitMandateAccepted: boolean;
  createdAt: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 ${highlight ? "font-bold" : ""}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-right ${highlight ? "text-persal-dark" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-bold text-persal-dark tracking-wide uppercase">{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

export default function LoanApplicationStatementPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("guestLoanApplyDraft");
    if (!raw) { router.replace("/apply"); return; }
    try {
      const parsed = JSON.parse(raw) as Draft;
      if (!parsed?.idNumber || !parsed?.email) { router.replace("/apply"); return; }
      setDraft(parsed);
    } catch {
      router.replace("/apply");
    }
  }, [router]);

  if (!draft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-persal-blue/30 border-t-persal-blue rounded-full animate-spin" />
      </div>
    );
  }

  const charges = calculateLoanCharges(draft.amount, draft.termDays);
  const termMonths = getTermMonths(draft.termDays);
  const repayDate = new Date();
  repayDate.setDate(repayDate.getDate() + draft.termDays);
  const repayDateLabel = repayDate.toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });

  const accountTypeLabel =
    draft.accountType === "CHEQUE" ? "Cheque / Current" :
    draft.accountType === "SAVINGS" ? "Savings" :
    draft.accountType === "TRANSMISSION" ? "Transmission" :
    draft.accountType || "—";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="/">
            <img src="/logo.png" alt="Persal" className="h-10 w-auto object-contain" />
          </a>
          <nav className="flex gap-2 items-center">
            <Link href="/auth/login" className="text-persal-dark text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Log In</Link>
            <Link href="/auth/signup?from=apply" className="bg-persal-blue text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow hover:bg-persal-dark transition">Sign Up</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* Title */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-persal-dark">Application Statement</h1>
          <p className="text-sm text-gray-500 mt-1">Please review all your details before proceeding to face verification.</p>
        </div>

        {/* ── Loan Breakdown hero card ─────────────────────────────────── */}
        <div className="bg-[#0d2240] rounded-2xl p-5 shadow-lg text-white">
          <p className="text-teal-300 text-xs font-semibold uppercase tracking-widest mb-4">Loan Breakdown</p>

          {/* Top figures */}
          <div className="grid grid-cols-3 gap-3 text-center mb-5">
            <div>
              <div className="text-2xl font-black">R{fmt(draft.amount)}</div>
              <div className="text-teal-300 text-xs mt-0.5">Loan Amount</div>
            </div>
            <div>
              <div className="text-2xl font-black">{termMonths}</div>
              <div className="text-teal-300 text-xs mt-0.5">Month{termMonths > 1 ? "s" : ""}</div>
            </div>
            <div>
              <div className="text-2xl font-black text-orange-300">R{fmt(charges.monthlyRepayment)}</div>
              <div className="text-teal-300 text-xs mt-0.5">/ Month</div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="bg-white/10 rounded-xl px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between text-white/80">
              <span>Month 1 Interest (5%)</span>
              <span>R{fmt(charges.interestMonth1)}</span>
            </div>
            {charges.interestMonth2 > 0 && (
              <div className="flex justify-between text-white/80">
                <span>Month 2 Interest (3%)</span>
                <span>R{fmt(charges.interestMonth2)}</span>
              </div>
            )}
            {charges.interestMonth3 > 0 && (
              <div className="flex justify-between text-white/80">
                <span>Month 3 Interest (2%)</span>
                <span>R{fmt(charges.interestMonth3)}</span>
              </div>
            )}
            <div className="flex justify-between text-white/80">
              <span>Initiation Fee</span>
              <span>R{fmt(charges.initiationFee)}</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>Service Fee</span>
              <span>R{fmt(charges.serviceFee)}</span>
            </div>
            <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-white">
              <span>Total Fees & Interest</span>
              <span>R{fmt(charges.totalCost)}</span>
            </div>
            <div className="flex justify-between font-bold text-orange-300 text-base">
              <span>Total Repayable</span>
              <span>R{fmt(charges.totalRepayable)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-teal-300 border-t border-white/10 pt-3">
            <span>{draft.termDays} days ({termMonths} monthly repayments)</span>
            <span>Final payment by <span className="text-white font-semibold">{repayDateLabel}</span></span>
          </div>
        </div>

        {/* ── Personal Details ─────────────────────────────────────────── */}
        <Section title="Personal Details" icon="👤">
          <Row label="Full Name" value={draft.fullName} />
          <Row label="Email Address" value={draft.email} />
          <Row label="SA Cell Number" value={draft.phone} />
          <Row label="SA ID Number" value={draft.idNumber} />
          <Row label="Persal Number" value={draft.persalNumber || "—"} />
        </Section>

        {/* ── Income Details ───────────────────────────────────────────── */}
        <Section title="Income Details" icon="💼">
          <Row label="Gross Monthly Salary" value={`R ${Number(draft.grossSalary).toLocaleString()}`} />
          <Row label="Disposable Income" value={`R ${Number(draft.disposableIncome).toLocaleString()}`} />
          <Row
            label="Affordability"
            value={
              <span className={Number(draft.disposableIncome) >= draft.amount * 0.25 ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
                {Number(draft.disposableIncome) >= draft.amount * 0.25 ? "✓ Meets requirement" : "⚠ Below recommended"}
              </span>
            }
          />
        </Section>

        {/* ── Banking Details ──────────────────────────────────────────── */}
        <Section title="Banking Details" icon="🏦">
          <Row label="Bank" value={draft.bankName} />
          <Row label="Account Number" value={draft.accountNumber} />
          <Row label="Account Type" value={accountTypeLabel} />
          <Row label="Branch Code" value={draft.branchCode} />
        </Section>

        {/* ── Documents ───────────────────────────────────────────────── */}
        <Section title="Supporting Documents" icon="📎">
          <Row
            label="Bank Statement"
            value={
              draft.bankStatementDocument
                ? <span className="text-green-600 font-semibold">✓ {draft.bankStatementDocument.name} ({Math.round(draft.bankStatementDocument.size / 1024)} KB)</span>
                : <span className="text-red-500">Not uploaded</span>
            }
          />
          <Row
            label="ID Document"
            value={
              draft.guestIdFront
                ? <span className="text-green-600 font-semibold">✓ {draft.guestIdFront.name} ({Math.round(draft.guestIdFront.size / 1024)} KB)</span>
                : <span className="text-red-500">Not uploaded</span>
            }
          />
        </Section>

        {/* ── Declarations ────────────────────────────────────────────── */}
        <Section title="Declarations" icon="✅">
          <Row
            label="Debit Mandate"
            value={
              <span className={draft.debitMandateAccepted ? "text-green-600 font-semibold" : "text-red-500"}>
                {draft.debitMandateAccepted ? "✓ Accepted" : "Not accepted"}
              </span>
            }
          />
        </Section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <div className="pt-2 pb-8 space-y-3">
          <button
            className="w-full bg-persal-blue hover:bg-persal-dark text-white font-bold py-4 rounded-2xl text-base shadow-lg transition"
            onClick={() => router.push("/apply/face-verification")}
          >
            Proceed to Face Verification →
          </button>
          <Link
            href="/apply"
            className="block text-center text-sm text-gray-500 hover:text-persal-blue transition"
          >
            ← Go back and edit my details
          </Link>
        </div>

      </main>
    </div>
  );
}
