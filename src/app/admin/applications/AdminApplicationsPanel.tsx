"use client";
import { useState } from "react";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";

type ApplicationUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  persalNumber: string | null;
  address: string | null;
  applicationStatus: "PENDING" | "APPROVED" | "REJECTED";
  applicationRejectionReason: string | null;
  applicationApprovedAt: string | null;
  applicationRejectedAt: string | null;
  joinedAt: string;
};

type Props = {
  initialUsers: ApplicationUser[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function AdminApplicationsPanel({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = filter === "ALL" ? users : users.filter((u) => u.applicationStatus === filter);

  const pendingCount = users.filter((u) => u.applicationStatus === "PENDING").length;

  async function handleApprove(userId: string) {
    setProcessing(userId);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${userId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to approve application");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, applicationStatus: "APPROVED", applicationApprovedAt: new Date().toISOString() }
            : u
        )
      );
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(userId: string) {
    setProcessing(userId);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${userId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to reject application");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                applicationStatus: "REJECTED",
                applicationRejectedAt: new Date().toISOString(),
                applicationRejectionReason: rejectReason || null,
              }
            : u
        )
      );
      setRejectingId(null);
      setRejectReason("");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="mt-8">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              filter === tab
                ? "bg-persal-dark text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab === "PENDING" ? `Pending Review${pendingCount > 0 ? ` (${pendingCount})` : ""}` : tab === "ALL" ? "All Applications" : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No {filter === "ALL" ? "" : filter.toLowerCase()} applications.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* User info */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-gray-400" />
                      <span className="font-semibold text-gray-800 text-lg">{user.fullName}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[user.applicationStatus]}`}>
                      {STATUS_LABELS[user.applicationStatus]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                    <div><span className="font-medium text-gray-700">Email: </span>{user.email}</div>
                    <div><span className="font-medium text-gray-700">Phone: </span>{user.phone ?? "—"}</div>
                    <div><span className="font-medium text-gray-700">ID Number: </span>{user.idNumber ?? "—"}</div>
                    <div><span className="font-medium text-gray-700">Persal No: </span>{user.persalNumber ?? "—"}</div>
                    <div className="sm:col-span-2"><span className="font-medium text-gray-700">Address: </span>{user.address ?? "—"}</div>
                    <div><span className="font-medium text-gray-700">Applied: </span>{new Date(user.joinedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    {user.applicationApprovedAt && (
                      <div><span className="font-medium text-gray-700">Approved: </span>{new Date(user.applicationApprovedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    )}
                    {user.applicationRejectedAt && (
                      <div><span className="font-medium text-gray-700">Rejected: </span>{new Date(user.applicationRejectedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    )}
                  </div>

                  {user.applicationRejectionReason && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                      <span className="font-medium">Rejection reason: </span>{user.applicationRejectionReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {user.applicationStatus === "PENDING" && (
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processing === user.id}
                      className="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(rejectingId === user.id ? null : user.id)}
                      disabled={processing === user.id}
                      className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                )}

                {user.applicationStatus === "REJECTED" && (
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processing === user.id}
                      className="flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 transition disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} />
                      Approve
                    </button>
                  </div>
                )}
              </div>

              {/* Reject reason input */}
              {rejectingId === user.id && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection reason <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Invalid Persal number, details could not be verified..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={processing === user.id}
                      className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 transition disabled:opacity-60"
                    >
                      {processing === user.id ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason(""); }}
                      className="rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold px-5 py-2 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
