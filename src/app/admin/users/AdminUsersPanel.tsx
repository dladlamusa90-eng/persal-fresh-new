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

function formatJoinedDate(value: string) {
  return value.slice(0, 10);
}

export default function AdminUsersPanel({ users }: Props) {
  const [rows, setRows] = useState(users);
  const [query, setQuery] = useState("");
  const [loadingById, setLoadingById] = useState<Record<string, "burn" | "restore" | "clear" | null>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});
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
    if (!normalized) return rows;

    return rows.filter((user) => {
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
  }, [rows, query]);

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

  async function handleClearUser(userId: string, role: string, name: string) {
    if (role === "ADMIN") {
      setErrorById((prev) => ({ ...prev, [userId]: "Admin accounts cannot be cleared." }));
      return;
    }

    const confirmed = window.confirm(`Clear user ${name}? This permanently deletes user and loan records.`);
    if (!confirmed) return;

    setLoadingById((prev) => ({ ...prev, [userId]: "clear" }));
    setErrorById((prev) => ({ ...prev, [userId]: "" }));

    try {
      const response = await fetch(`/api/admin/users/${userId}/clear`, {
        method: "DELETE",
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorById((prev) => ({ ...prev, [userId]: body.error ?? "Failed to clear user." }));
        return;
      }

      setRows((prev) => prev.filter((user) => user.id !== userId));
    } catch {
      setErrorById((prev) => ({ ...prev, [userId]: "Network error. Please try again." }));
    } finally {
      setLoadingById((prev) => ({ ...prev, [userId]: null }));
    }
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
      <div className="px-4 py-3 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50">
        <div>
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-lg font-bold text-gray-900">{stats.total}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-lg font-bold text-green-700">{stats.active}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Banned</p>
          <p className="text-lg font-bold text-red-700">{stats.burned}</p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <h2 className="text-base font-semibold text-gray-900">Users Details</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, role, ID, points, bank, persal, phone, or joined date"
          className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
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
              <td colSpan={13} className="px-4 py-6 text-center text-gray-500">
                No matching users found.
              </td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 last:border-0 align-top">
                <td className="px-4 py-3 text-gray-900 font-medium">{user.fullName}</td>
                <td className="px-4 py-3 text-gray-700">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{user.persalNumber ?? "N/A"}</td>
                <td className="px-4 py-3 text-gray-700">{user.idNumber ?? "N/A"}</td>
                <td className="px-4 py-3 text-gray-700">{user.phone ?? "N/A"}</td>
                <td className="px-4 py-3 text-gray-700">{user.points}</td>
                <td className="px-4 py-3 text-gray-700">{user.paidLoanCount}</td>
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
                <td className="px-4 py-3 text-gray-700">{formatJoinedDate(user.joinedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-persal-blue text-white text-xs font-semibold"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleAccess(user.id, user.role, user.isBurned)}
                        disabled={Boolean(loadingById[user.id]) || user.role === "ADMIN"}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                          user.isBurned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
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
                        onClick={() => handleClearUser(user.id, user.role, user.fullName)}
                        disabled={Boolean(loadingById[user.id]) || user.role === "ADMIN"}
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-800 hover:bg-black text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingById[user.id] === "clear" ? "Clearing..." : "Clear"}
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
  );
}
