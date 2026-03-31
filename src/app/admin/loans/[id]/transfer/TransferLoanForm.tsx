"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  loanId: string;
  applicantName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  branchCode: string | null;
  requestedAmount: number;
  alreadyTransferred: boolean;
  existingReference: string | null;
};

export default function TransferLoanForm({
  loanId,
  applicantName,
  bankName,
  accountNumber,
  branchCode,
  requestedAmount,
  alreadyTransferred,
  existingReference,
}: Props) {
  const router = useRouter();
  const [amount] = useState(requestedAmount.toFixed(2));
  const [reference, setReference] = useState(existingReference ?? `TRF-${Date.now()}-${loanId.slice(0, 6)}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleTransfer() {
    if (alreadyTransferred || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/loans/${loanId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          reference,
          mode: "MANUAL_TRANSFER",
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Failed to record transfer.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Transfer Loan</h2>
      <p className="mt-2 text-sm text-gray-600">Transfer the approved loan to the applicant using the exact requested amount captured from the application.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <TransferField label="Applicant" value={applicantName || "N/A"} />
        <TransferField label="Bank" value={bankName || "N/A"} />
        <TransferField label="Account Number" value={accountNumber || "N/A"} />
        <TransferField label="Branch Code" value={branchCode || "N/A"} />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Transfer Amount</span>
          <input
            type="number"
            value={amount}
            readOnly
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Transfer Reference</span>
          <input
            type="text"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            disabled={alreadyTransferred || saving}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 disabled:opacity-60"
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleTransfer}
          disabled={alreadyTransferred || saving}
          className="inline-flex items-center justify-center rounded-xl bg-persal-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-persal-dark disabled:opacity-50"
        >
          {alreadyTransferred ? "Transfer Recorded" : saving ? "Recording Transfer..." : "Record Transfer"}
        </button>
      </div>
    </div>
  );
}

function TransferField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}