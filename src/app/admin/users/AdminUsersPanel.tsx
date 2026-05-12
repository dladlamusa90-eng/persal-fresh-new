"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  points: number;
  persalNumber: string | null;
  applicationStatus?: string | null;
  phone: string | null;
  idNumber: string | null;
  bankName: string | null;
  accountNumber: string | null;
  isBurned: boolean;
  paidLoanCount: number;
  profitTotal: number;
  profit30Days: number;
  joinedAt: string;
};

type Props = {
  users: AdminUserRow[];
};

type DeleteDialogState = {
  userId: string;
  role: string;
  name: string;
} | null;

function formatJoinedDate(value: string) {
  return value.slice(0, 10);
}

export default function AdminUsersPanel({ users }: Props) {
  const [rows, setRows] = useState(users);
  const [showUserOversight, setShowUserOversight] = useState(false);
  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<"ALL" | "ACTIVE" | "BANNED">("ALL");
  const [loadingById, setLoadingById] = useState<Record<string, "burn" | "restore" | "delete" | "clearRecords" | null>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const currencyFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, user) => {
        acc.total += 1;
        if (user.isBurned) acc.burned += 1;
        else acc.active += 1;
        return acc;
      },
      { total: 0, active: 0, burned: 0 }
    );
  }, [rows]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const accessScoped = rows.filter((user) => {
      if (accessFilter === "ACTIVE") return !user.isBurned;
      if (accessFilter === "BANNED") return user.isBurned;
      return true;
    });

    if (!normalized) return accessScoped;

    return accessScoped.filter((user) => {
      const joinedDate = formatJoinedDate(user.joinedAt);

      return [
        user.fullName,
        user.email,
        user.role,
        user.persalNumber ?? "",
        user.phone ?? "",
        user.idNumber ?? "",
        user.bankName ?? "",
        String(user.points),
        joinedDate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [rows, query, accessFilter]);

  async function handleToggleAccess(userId: string, role: string, isBurned: boolean) {
    if (role === "ADMIN") {
      setErrorById((prev) => ({ ...prev, [userId]: "Admin accounts cannot be banned." }));
      return;
    }

    const action = isBurned ? "restore" : "burn";
    setLoadingById((prev) => ({ ...prev, [userId]: action }));
    setErrorById((prev) => ({ ...prev, [userId]: "" }));

    try {
      const response = await fetch(`/api/admin/users/${userId}/burn`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ burned: !isBurned }),
      });

      const body = (await response.json()) as { error?: string; user?: { isBurned?: boolean } };
      if (!response.ok) {
        setErrorById((prev) => ({ ...prev, [userId]: body.error ?? "Failed to update access." }));
        return;
      }

      setRows((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, isBurned: Boolean(body.user?.isBurned) } : user
        )
      );
    } catch {
      setErrorById((prev) => ({ ...prev, [userId]: "Network error. Please try again." }));
    } finally {
      setLoadingById((prev) => ({ ...prev, [userId]: null }));
    }
  }

  function handleDeleteUser(userId: string, role: string, name: string) {
    if (role === "ADMIN") {
      setErrorById((prev) => ({ ...prev, [userId]: "Admin accounts cannot be deleted." }));
      return;
    }

    setDeleteDialog({ userId, role, name });
  }

  async function confirmDeleteUser(preserveProfitRecords: boolean) {
    if (!deleteDialog) return;

    const { userId } = deleteDialog;
    setDeleteDialog(null);

    setLoadingById((prev) => ({ ...prev, [userId]: "delete" }));
    setErrorById((prev) => ({ ...prev, [userId]: "" }));

    try {
      const response = await fetch(`/api/admin/users/${userId}/clear`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preserveProfitRecords }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorById((prev) => ({ ...prev, [userId]: body.error ?? "Failed to delete user." }));
        return;
      }

      setRows((prev) => prev.filter((user) => user.id !== userId));
    } catch {
      setErrorById((prev) => ({ ...prev, [userId]: "Network error. Please try again." }));
    } finally {
      setLoadingById((prev) => ({ ...prev, [userId]: null }));
    }
  }

  async function handleClearUserRecords(userId: string, role: string, name: string) {
    if (role === "ADMIN") {
      setErrorById((prev) => ({ ...prev, [userId]: "Admin accounts cannot be cleared." }));
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to clear ${name}'s records only? This will remove loans, notifications, points history, and application drafts but keep the user account.`
    );

    if (!confirmed) return;

    setLoadingById((prev) => ({ ...prev, [userId]: "clearRecords" }));
    setErrorById((prev) => ({ ...prev, [userId]: "" }));

    try {
      const response = await fetch(`/api/admin/users/${userId}/clear`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearRecordsOnly: true }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorById((prev) => ({ ...prev, [userId]: body.error ?? "Failed to clear user records." }));
        return;
      }

      setRows((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                points: 0,
                paidLoanCount: 0,
                profitTotal: 0,
                profit30Days: 0,
              }
            : user
        )
      );
    } catch {
      setErrorById((prev) => ({ ...prev, [userId]: "Network error. Please try again." }));
    } finally {
      setLoadingById((prev) => ({ ...prev, [userId]: null }));
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setShowUserOversight((prev) => !prev)}
        className="w-full px-4 md:px-5 py-3 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue flex items-center justify-between text-left"
      >
        <p className="text-xs uppercase tracking-[0.14em] text-slate-100/90 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          User Oversight
        </p>
        <span className="text-xs font-semibold text-slate-100">{showUserOversight ? "Collapse" : "Expand"}</span>
      </button>

      {showUserOversight && (
      <>

      <div className="px-4 md:px-5 py-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white">
        <button
          type="button"
          onClick={() => setAccessFilter("ALL")}
          className={`rounded-xl border bg-gradient-to-br from-white to-slate-50 p-3 text-left transition ${
            accessFilter === "ALL" ? "border-slate-400 ring-2 ring-slate-200" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-xs text-slate-500">Total Users</p>
          <p className="text-lg font-bold text-slate-900">{stats.total}</p>
        </button>
        <button
          type="button"
          onClick={() => setAccessFilter("ACTIVE")}
          className={`rounded-xl border bg-gradient-to-br from-white to-green-50 p-3 text-left transition ${
            accessFilter === "ACTIVE" ? "border-green-400 ring-2 ring-green-100" : "border-slate-200 hover:border-green-300"
          }`}
        >
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-lg font-bold text-green-700">{stats.active}</p>
        </button>
        <button
          type="button"
          onClick={() => setAccessFilter("BANNED")}
          className={`rounded-xl border bg-gradient-to-br from-white to-red-50 p-3 text-left transition ${
            accessFilter === "BANNED" ? "border-red-400 ring-2 ring-red-100" : "border-slate-200 hover:border-red-300"
          }`}
        >
          <p className="text-xs text-slate-500">Banned</p>
          <p className="text-lg font-bold text-red-700">{stats.burned}</p>
        </button>
      </div>

      <div className="px-4 md:px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-white">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
          </span>
          Users Details
        </h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, role, ID, points, bank, persal, phone, or joined date"
          className="w-full md:w-96 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue"
        />
        <p className="text-xs text-slate-500">
          Filter: <span className="font-semibold text-slate-700">{accessFilter}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600 bg-slate-50/70">
            <th className="px-4 py-3 font-semibold">Full Name</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-4 py-3 font-semibold">Persal Number</th>
            <th className="px-4 py-3 font-semibold">ID Number</th>
            <th className="px-4 py-3 font-semibold">Phone</th>
            <th className="px-4 py-3 font-semibold">Points</th>
            <th className="px-4 py-3 font-semibold">Paid Loans</th>
            <th className="px-4 py-3 font-semibold">User Profit</th>
            <th className="px-4 py-3 font-semibold">Profit 30d</th>
            <th className="px-4 py-3 font-semibold">Access</th>
            <th className="px-4 py-3 font-semibold">Date Joined</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={13} className="px-4 py-6 text-center text-slate-500">
                No matching users found.
              </td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50/70">
                <td className="px-4 py-3 text-slate-900 font-medium">{user.fullName}</td>
                <td className="px-4 py-3 text-slate-700">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.persalNumber ?? "N/A"}
                  {user.persalNumber && (
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                      user.applicationStatus === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : user.applicationStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : user.applicationStatus === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {user.applicationStatus || "UNKNOWN"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{user.idNumber ?? "N/A"}</td>
                <td className="px-4 py-3 text-slate-700">{user.phone ?? "N/A"}</td>
                <td className="px-4 py-3 text-slate-700">{user.points}</td>
                <td className="px-4 py-3 text-slate-700">{user.paidLoanCount}</td>
                <td className="px-4 py-3 text-green-700 font-semibold">
                  R {currencyFormatter.format(Math.round(user.profitTotal))}
                </td>
                <td className="px-4 py-3 text-green-700 font-semibold">
                  R {currencyFormatter.format(Math.round(user.profit30Days))}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${user.isBurned ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {user.isBurned ? "Banned" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatJoinedDate(user.joinedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Persal review actions */}
                      {user.persalNumber && user.applicationStatus === "PENDING" && (
                        <>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-200"
                            onClick={async () => {
                              await fetch(`/api/admin/users/${user.id}/persal-approve`, { method: "POST" });
                              setRows((prev) => prev.map((u) => u.id === user.id ? { ...u, applicationStatus: "APPROVED" } : u));
                            }}
                          >
                            Approve Persal
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                            onClick={async () => {
                              await fetch(`/api/admin/users/${user.id}/persal-reject`, { method: "POST" });
                              setRows((prev) => prev.map((u) => u.id === user.id ? { ...u, applicationStatus: "REJECTED" } : u));
                            }}
                          >
                            Reject Persal
                          </button>
                        </>
                      )}
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleClearUserRecords(user.id, user.role, user.fullName)}
                        disabled={Boolean(loadingById[user.id]) || user.role === "ADMIN"}
                        className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loadingById[user.id] === "clearRecords" ? "Clearing..." : "Clear Records"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAccess(user.id, user.role, user.isBurned)}
                        disabled={Boolean(loadingById[user.id]) || user.role === "ADMIN"}
                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                          user.isBurned
                            ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
                            : "bg-orange-500 hover:bg-orange-600 focus:ring-orange-200"
                        }`}
                      >
                        {loadingById[user.id] === "burn" || loadingById[user.id] === "restore"
                          ? "Saving..."
                          : user.isBurned
                            ? "Restore"
                            : "Ban"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id, user.role, user.fullName)}
                        disabled={Boolean(loadingById[user.id]) || user.role === "ADMIN"}
                        className="inline-flex items-center rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loadingById[user.id] === "delete" ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                    {errorById[user.id] && (
                      <p className="text-xs text-red-600">{errorById[user.id]}</p>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
      </>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-label="Delete user options">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900">Delete {deleteDialog.name}?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Choose how to handle this user's historical data after deleting the account.
            </p>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => void confirmDeleteUser(true)}
                className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                Keep Records
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteUser(false)}
                className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Erase Records (Full Delete)
              </button>
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
