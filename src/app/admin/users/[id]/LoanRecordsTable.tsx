"use client";
import React, { useState } from "react";

export default function LoanRecordsTable({ user }: { user: any }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadingLoanId, setLoadingLoanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState(user.loans);

  const handleApproveLoan = async (loanId: string) => {
    setLoadingLoanId(loanId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/loans/${loanId}/approve`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve loan");
      setLoans((prev: any[]) => prev.map(l => l.id === loanId ? { ...l, status: "APPROVED", rejectionReason: null } : l));
    } catch (e: any) {
      setError(e.message || "Failed to approve loan");
    } finally {
      setLoadingLoanId(null);
    }
  };

  const handleRejectLoan = async (loanId: string, reason: string) => {
    setLoadingLoanId(loanId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/loans/${loanId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject loan");
      setLoans((prev: any[]) => prev.map(l => l.id === loanId ? { ...l, status: "REJECTED", rejectionReason: reason } : l));
    } catch (e: any) {
      setError(e.message || "Failed to reject loan");
    } finally {
      setLoadingLoanId(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto mt-6">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">Loan Records</h2>
      </div>
      {error && <div className="p-3 text-red-600">{error}</div>}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="px-4 py-3 font-semibold">Loan ID</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Term</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Rejection Reason</th>
            <th className="px-4 py-3 font-semibold">Disbursed</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Bank Statement</th>
          </tr>
        </thead>
        <tbody>
          {loans.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-gray-500">No loans found.</td>
            </tr>
          ) : (
            loans.map((loan: any, idx: number) => (
              <React.Fragment key={loan.id}>
                <tr className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-700 cursor-pointer" onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}>
                    {loan.id}
                    <span className="ml-2 text-xs text-persal-blue">{expandedRow === idx ? "▲" : "▼"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">R {loan.amount.toLocaleString("en-US")}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.termDays} days</td>
                  <td className="px-4 py-3 text-gray-700">{loan.status}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.rejectionReason ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.disbursementSentAt ? new Date(loan.disbursementSentAt).toISOString().slice(0, 10) : "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.createdAt ? new Date(loan.createdAt).toISOString().slice(0, 10) : "-"}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {loan.applicationDocuments && loan.applicationDocuments.bankStatement && loan.applicationDocuments.bankStatement.dataUrl ? (
                      <a
                        href={loan.applicationDocuments.bankStatement.dataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-persal-blue underline hover:text-persal-dark"
                        download={loan.applicationDocuments.bankStatement.name || undefined}
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
                {expandedRow === idx && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-semibold mb-2">Application Data</h3>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li><strong>Gross Salary:</strong> R {loan.grossSalary ?? "-"}</li>
                            <li><strong>Disposable Income:</strong> R {loan.disposableIncome ?? "-"}</li>
                            <li><strong>Applicant Name:</strong> {loan.applicantFullName ?? "-"}</li>
                            <li><strong>Email:</strong> {loan.applicantEmail ?? "-"}</li>
                            <li><strong>Phone:</strong> {loan.applicantPhone ?? "-"}</li>
                            <li><strong>ID Number:</strong> {loan.applicantIdNumber ?? "-"}</li>
                            <li><strong>Persal Number:</strong> {loan.applicantPersalNumber ?? "-"}</li>
                            <li><strong>Bank:</strong> {loan.applicantBankName ?? "-"}</li>
                            <li><strong>Account Number:</strong> {loan.applicantAccountNumber ?? "-"}</li>
                            <li><strong>Branch Code:</strong> {loan.applicantBranchCode ?? "-"}</li>
                          </ul>
                        </div>
                        <div>
                          <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div>
                              <div className="font-semibold text-sm mb-1">Selfie Photo</div>
                              {loan.applicationDocuments && loan.applicationDocuments.selfiePhoto && loan.applicationDocuments.selfiePhoto.dataUrl ? (
                                <a href={loan.applicationDocuments.selfiePhoto.dataUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={loan.applicationDocuments.selfiePhoto.dataUrl} alt="Selfie" className="w-32 h-32 object-cover rounded border" />
                                </a>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-sm mb-1">ID Document</div>
                              {loan.applicationDocuments && loan.applicationDocuments.identityDocument && loan.applicationDocuments.identityDocument.dataUrl ? (
                                <a href={loan.applicationDocuments.identityDocument.dataUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={loan.applicationDocuments.identityDocument.dataUrl} alt="ID Document" className="w-32 h-32 object-cover rounded border" />
                                </a>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">Approve only if the ID document photo matches the selfie.</div>
                          {loan.status === "PENDING" && (
                            <div className="space-y-2">
                              <button
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                                onClick={() => handleApproveLoan(loan.id)}
                                disabled={loadingLoanId === loan.id || !(loan.applicationDocuments && loan.applicationDocuments.selfiePhoto && loan.applicationDocuments.identityDocument)}
                              >
                                {loadingLoanId === loan.id ? "Approving..." : "Approve"}
                              </button>
                              <div>
                                <input
                                  type="text"
                                  className="border rounded p-2 w-64"
                                  placeholder="Rejection reason"
                                  value={rejectionReason}
                                  onChange={e => setRejectionReason(e.target.value)}
                                  disabled={loadingLoanId === loan.id}
                                />
                                <button
                                  className="ml-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                                  onClick={() => handleRejectLoan(loan.id, rejectionReason)}
                                  disabled={loadingLoanId === loan.id || !rejectionReason.trim()}
                                >
                                  {loadingLoanId === loan.id ? "Rejecting..." : "Reject"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
