"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOAN_REJECTION_REASONS } from "@/lib/loanRejectionReasons";

type Props = {
  loanId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  rejectionReason: string | null;
  disbursementSentAt: string | null;
  disbursementReference: string | null;
};

export default function ApplicationDecisionCard({
  loanId,
  status,
  rejectionReason,
  disbursementSentAt,
  disbursementReference,
}: Props) {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function handleApprove() {
    setLoading("approve");
    setError("");

    try {
      const response = await fetch(`/api/admin/loans/${loanId}/approve`, { method: "PATCH" });
      const body = (await response.json()) as { error?: string; transferUrl?: string };
      if (!response.ok) {
        setError(body.error ?? "Failed to approve loan.");
        return;
      }

      router.push(body.transferUrl ?? `/admin/loans/${loanId}/transfer`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!selectedReason) {
      setError("Please select a rejection reason.");
      return;
    }

    setLoading("reject");
    setError("");

    try {
      const response = await fetch(`/api/admin/loans/${loanId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: selectedReason }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Failed to reject loan.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
      <h2 className="text-lg font-semibold text-gray-900">Decision</h2>
      <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <p className="text-xs text-gray-500">Current Status</p>
        <p className="mt-1 text-base font-semibold text-gray-900">{status}</p>
        {status === "REJECTED" && rejectionReason && (
          <p className="mt-3 text-sm text-red-600">Reason: {rejectionReason}</p>
        )}
        {status === "APPROVED" && !disbursementSentAt && (
          <p className="mt-3 text-sm text-amber-600">Approved and waiting for disbursement.</p>
        )}
        {status === "APPROVED" && disbursementSentAt && (
          <p className="mt-3 text-sm text-green-600">Disbursed: {disbursementReference ?? "Recorded"}</p>
        )}
      </div>

      {status === "PENDING" && (
        <div className="mt-4 space-y-3">
          <select
            value={selectedReason}
            onChange={(event) => setSelectedReason(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700"
            disabled={Boolean(loading)}
          >
            <option value="">Select rejection reason</option>
            {LOAN_REJECTION_REASONS.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleApprove}
            disabled={Boolean(loading)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading === "approve" ? "Approving..." : "Approve and Continue to Disbursement"}
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={Boolean(loading)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading === "reject" ? "Rejecting..." : "Reject Application"}
          </button>
        </div>
      )}

      {status === "APPROVED" && !disbursementSentAt && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.push(`/admin/loans/${loanId}/transfer`)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-persal-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-persal-dark"
          >
            Open Disbursement Screen
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}