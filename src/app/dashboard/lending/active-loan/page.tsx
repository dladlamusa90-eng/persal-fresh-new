"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Banknote, ShieldCheck } from "lucide-react";
import { calculateLoanCharges, getTermEndDate, getTermMonths } from "@/lib/loanPolicy";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

type LatestLoan = {
  id: string;
  amount: number;
  termDays: number;
  status: LoanStatus;
  rejectionReason: string | null;
  createdAt: string;
};

export default function ActiveLoanPage() {
  const [loan, setLoan] = useState<LatestLoan | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadLoan() {
      try {
        const response = await fetch("/api/loans/me", { cache: "no-store" });
        if (!response.ok) return;

        const body = (await response.json()) as { latestLoan?: LatestLoan | null };
        const latestLoan = body.latestLoan ?? null;

        if (!mounted) return;

        if (!latestLoan || latestLoan.status === "REJECTED" || latestLoan.status === "PAID") {
          setLoan(null);
          return;
        }

        setLoan(latestLoan);
      } catch {
        if (mounted) setLoan(null);
      }
    }

    loadLoan();

    return () => {
      mounted = false;
    };
  }, []);

  const loanDetails = useMemo(() => {
    if (!loan) return null;

    const charges = calculateLoanCharges(loan.amount, loan.termDays);
    const termMonths = getTermMonths(loan.termDays);
    const nextDeductionDate = getTermEndDate(new Date(loan.createdAt), loan.termDays);

    const interestParts = ["5% (Month 1)"];
    if (termMonths >= 2) interestParts.push("3% (Month 2)");
    if (termMonths >= 3) interestParts.push("2% (Month 3)");

    return {
      id: loan.id,
      amount: loan.amount,
      repayable: charges.totalRepayable,
      earlyRepayable: calculateLoanCharges(loan.amount, 30).totalRepayable,
      term: `${termMonths} month${termMonths > 1 ? "s" : ""}`,
      interest: interestParts.join(", "),
      status: loan.status,
      nextDeduction: nextDeductionDate.toISOString().slice(0, 10),
    };
  }, [loan]);

  const handlePayNow = async () => {
    if (!loanDetails) return;

    setPaymentMessage("");
    setPaymentError("");
    setIsPaying(true);

    try {
      const response = await fetch(`/api/loans/${loanDetails.id}/pay`, {
        method: "POST",
      });

      const body = (await response.json()) as {
        message?: string;
        error?: string;
        pointsAwarded?: number;
        payment?: { earlyPayment?: boolean; amountPaid?: number };
      };

      if (!response.ok) {
        setPaymentError(body.error ?? "Payment failed.");
        return;
      }

      const amountPaid = Number(body.payment?.amountPaid ?? 0).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
      const pointsAwarded = body.pointsAwarded ?? 0;
      const earlyTag = body.payment?.earlyPayment ? " (early-payment rule applied)" : "";

      setPaymentMessage(`Payment recorded: R ${amountPaid}${earlyTag}. Points awarded: ${pointsAwarded}.`);
      setLoan(null);
    } catch {
      setPaymentError("Network error while recording payment.");
    } finally {
      setIsPaying(false);
    }
  };

  // PDF download using jsPDF (client-side)
  const handleDownloadPDF = async () => {
    if (!loanDetails) return;

    const jsPDF = (await import('jspdf')).jsPDF;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Active Loan Details', 14, 18);
    doc.setFontSize(12);
    let y = 30;
    Object.entries(loanDetails).forEach(([key, value]) => {
      doc.text(`${key.replace(/([A-Z])/g, ' $1')}: ${value}`, 14, y);
      y += 10;
    });
    doc.save('active-loan-details.pdf');
  };

  // CSV download
  const handleDownloadCSV = () => {
    if (!loanDetails) return;

    const csvRows = [
      'Field,Value',
      ...Object.entries(loanDetails).map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1')},"${value}"`)
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'active-loan-details.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!loanDetails) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8 mt-8">
        <h1 className="text-3xl font-bold text-persal-blue mb-6">Active Loan Details</h1>
        <p className="text-gray-600">No active loan found.</p>
        {paymentMessage && <p className="text-green-700 mt-3">{paymentMessage}</p>}
        {paymentError && <p className="text-red-600 mt-3">{paymentError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8 mt-8">
      <h1 className="text-3xl font-bold text-persal-blue mb-6">Active Loan Details</h1>
      <div className="flex flex-col gap-4 mb-8">
          {/* Payroll Deduction Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col gap-4 items-center justify-center mb-2">
            <h2 className="text-xl font-semibold text-persal-blue mb-2">Payroll Deduction</h2>
            <div className="flex items-center gap-2">
              <Banknote className="w-6 h-6 text-teal-600" />
              <span className="text-lg font-bold text-gray-900">R {loanDetails.amount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">Monthly repayment amount</span>
              <span className="text-base font-semibold text-teal-700 ml-auto">R {(loanDetails.repayable / getTermMonths(loan.termDays)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span className="text-xs font-medium text-teal-700">Secure Payroll Deduction</span>
            </div>
          </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Term</span>
          <span className="text-base font-semibold text-gray-900 ml-auto">{loanDetails.term}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Interest Rate</span>
          <span className="text-base font-semibold text-gray-900 ml-auto">{loanDetails.interest}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Status</span>
          <span className="text-base font-semibold text-green-600 ml-auto">{loanDetails.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Final Repayment Date</span>
          <span className="text-base font-semibold text-gray-900 ml-auto">{loanDetails.nextDeduction}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Total repayable</span>
          <span className="text-base font-semibold text-gray-900 ml-auto">R {loanDetails.repayable.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex gap-4">
        <button onClick={handleDownloadPDF} className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition">Download PDF</button>
        <button onClick={handleDownloadCSV} className="px-6 py-3 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition">Download CSV</button>
      </div>
      <button
        type="button"
        onClick={handlePayNow}
        disabled={isPaying}
        className="mt-4 w-full px-6 py-3 bg-persal-blue hover:bg-persal-dark text-white rounded-lg font-semibold transition disabled:opacity-60"
      >
        {isPaying ? "Recording Monthly Repayment..." : "Record Monthly Repayment (Test Only, No Real Money)"}
      </button>
      {paymentMessage && <p className="text-green-700 mt-3">{paymentMessage}</p>}
      {paymentError && <p className="text-red-600 mt-3">{paymentError}</p>}
    </div>
  );
}
