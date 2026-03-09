"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  persalNumber: string | null;
  phone: string | null;
  idNumber: string | null;
  bankName: string | null;
  accountNumber: string | null;
  isBurned: boolean;
  joinedAt: string;
};

type Props = {
  users: AdminUserRow[];
};

function formatJoinedDate(value: string) {
  return value.slice(0, 10);
}

export default function AdminUsersPanel({ users }: Props) {
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;

    return users.filter((user) => {
      const joinedDate = formatJoinedDate(user.joinedAt);

      return [
        user.fullName,
        user.email,
        user.role,
        user.persalNumber ?? "",
        user.phone ?? "",
        joinedDate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [users, query]);

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
      <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <h2 className="text-base font-semibold text-gray-900">Users Details</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, role, persal, phone, or joined date"
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
            <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Access</th>
            <th className="px-4 py-3 font-semibold">Date Joined</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                No matching users found.
              </td>
            </tr>
          ) : (
            filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 text-gray-900 font-medium">{user.fullName}</td>
                <td className="px-4 py-3 text-gray-700">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{user.persalNumber ?? "N/A"}</td>
                <td className="px-4 py-3 text-gray-700">{user.phone ?? "N/A"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${user.isBurned ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {user.isBurned ? "Burned" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{formatJoinedDate(user.joinedAt)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-persal-blue text-white text-xs font-semibold"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
