import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import BurnUserButton from "../BurnUserButton";
import UpdateUserPointsForm from "./UpdateUserPointsForm";

type Props = {
  params: Promise<{ id: string }>;
};

async function getUserDetails(id: string) {
  const baseSelect = {
    id: true,
    fullName: true,
    email: true,
    role: true,
    persalNumber: true,
    phone: true,
    idNumber: true,
    bankName: true,
    accountNumber: true,
    createdAt: true,
    isBurned: true,
    burnedAt: true,
    loans: {
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        amount: true,
        termDays: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },
    },
  };

  try {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        ...baseSelect,
        points: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("Unknown field `points`")) {
      throw error;
    }

    const fallbackUser = await prisma.user.findUnique({
      where: { id },
      select: baseSelect,
    });

    if (!fallbackUser) {
      return null;
    }

    return {
      ...fallbackUser,
      points: 0,
    };
  }
}

export default async function AdminUserDetailsPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const user = await getUserDetails(id);

  if (!user) {
    notFound();
  }

  return (
    <section className="max-w-full mx-auto py-8 md:py-10 px-4 md:px-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-persal-blue">User Details</h1>
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
        >
          Back to Users
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-semibold">Full Name:</span> {user.fullName}</p>
            <p><span className="font-semibold">Email:</span> {user.email}</p>
            <p><span className="font-semibold">Role:</span> {user.role}</p>
            <p><span className="font-semibold">Persal Number:</span> {user.persalNumber ?? "N/A"}</p>
            <p><span className="font-semibold">Cell Number:</span> {user.phone ?? "N/A"}</p>
            <p><span className="font-semibold">ID Number:</span> {user.idNumber ?? "N/A"}</p>
            <p><span className="font-semibold">Bank Name:</span> {user.bankName ?? "N/A"}</p>
            <p><span className="font-semibold">Account Number:</span> {user.accountNumber ?? "N/A"}</p>
            <p><span className="font-semibold">Date Joined:</span> {user.createdAt.toISOString().slice(0, 10)}</p>
            <p>
              <span className="font-semibold">Access:</span>{" "}
              <span className={user.isBurned ? "text-red-700 font-semibold" : "text-green-700 font-semibold"}>
                {user.isBurned ? "Burned" : "Active"}
              </span>
            </p>
            {user.burnedAt && (
              <p><span className="font-semibold">Burned At:</span> {user.burnedAt.toISOString().slice(0, 10)}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <UpdateUserPointsForm userId={user.id} initialPoints={user.points} />
            <BurnUserButton userId={user.id} role={user.role} initialBurned={user.isBurned} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Loan Records</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="px-4 py-3 font-semibold">Loan ID</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Term</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Rejection Reason</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {user.loans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">No loans found.</td>
              </tr>
            ) : (
              user.loans.map((loan) => (
                <tr key={loan.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{loan.id}</td>
                  <td className="px-4 py-3 text-gray-700">R {loan.amount.toLocaleString("en-US")}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.termDays} days</td>
                  <td className="px-4 py-3 text-gray-700">{loan.status}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.rejectionReason ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
