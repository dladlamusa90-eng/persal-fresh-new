import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import AdminUsersPanel from "./AdminUsersPanel";

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{ role?: string; page?: string }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { role: roleParam, page: pageParam } = await searchParams;
  const roleFilter: Role | undefined = roleParam === "ADMIN" || roleParam === "USER" ? roleParam : undefined;
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const where = roleFilter ? { role: roleFilter } : undefined;

  const totalUsers = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      persalNumber: true,
      phone: true,
      idNumber: true,
      bankName: true,
      accountNumber: true,
      isBurned: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const usersData = users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    persalNumber: user.persalNumber,
    phone: user.phone,
    idNumber: user.idNumber,
    bankName: user.bankName,
    accountNumber: user.accountNumber,
    isBurned: user.isBurned,
    joinedAt: user.createdAt.toISOString(),
  }));

  return (
    <section className="max-w-6xl mx-auto py-8 md:py-10 px-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-persal-blue">Users Details</h1>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
        >
          Back to Admin Panel
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-gray-600">
          Role: <span className="font-semibold text-gray-800">{roleFilter ?? "All"}</span> · Page {safePage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={
              safePage > 1
                ? `/admin/users?page=${safePage - 1}${roleFilter ? `&role=${roleFilter}` : ""}`
                : `/admin/users?page=1${roleFilter ? `&role=${roleFilter}` : ""}`
            }
            className={`px-3 py-1.5 rounded-md border text-sm ${safePage > 1 ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-200 text-gray-400 pointer-events-none"}`}
          >
            Previous
          </Link>
          <Link
            href={
              safePage < totalPages
                ? `/admin/users?page=${safePage + 1}${roleFilter ? `&role=${roleFilter}` : ""}`
                : `/admin/users?page=${totalPages}${roleFilter ? `&role=${roleFilter}` : ""}`
            }
            className={`px-3 py-1.5 rounded-md border text-sm ${safePage < totalPages ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-200 text-gray-400 pointer-events-none"}`}
          >
            Next
          </Link>
        </div>
      </div>

      <AdminUsersPanel users={usersData} />
    </section>
  );
}
