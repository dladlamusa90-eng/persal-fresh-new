import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import AdminLoansPanel from "@/app/admin/AdminLoansPanel";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const loans = await prisma.loan.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            persalNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const totalUsers = await prisma.user.count({ where: { role: "USER" } });
  const totalAdmins = await prisma.user.count({ where: { role: "ADMIN" } });

  const initialLoans = loans.map((loan) => ({
    id: loan.id,
    applicantName: loan.user.fullName,
    persalNumber: loan.user.persalNumber,
    amount: loan.amount,
    termDays: loan.termDays,
    status: loan.status,
    rejectionReason: loan.rejectionReason,
    createdAt: loan.createdAt.toISOString(),
  }));

  return (
    <section className="max-w-6xl mx-auto py-8 md:py-10 px-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-persal-blue">Admin Panel</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-lg bg-persal-blue text-white text-sm font-semibold hover:bg-persal-dark transition"
          >
            View Users Details
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
          >
            Logout
          </Link>
        </div>
      </div>

      <AdminLoansPanel
        initialLoans={initialLoans}
        totalUsers={totalUsers}
        totalAdmins={totalAdmins}
      />
    </section>
  );
}
