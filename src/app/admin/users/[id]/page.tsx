import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import BurnUserButton from "../BurnUserButton";
import UpdateUserPointsForm from "./UpdateUserPointsForm";
import SendUserMessageForm from "./SendUserMessageForm";

type UserLoan = {
  id: string;
  amount: number;
  termDays: number;
  status: string;
  rejectionReason: string | null;
  faceVerificationPhoto: string | null;
  faceMatchPassed: boolean;
  faceMatchCheckedAt: Date | null;
  createdAt: Date;
  disbursementSentAt: Date | null;
};

type UserDetails = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  persalNumber: string | null;
  phone: string | null;
  idNumber: string | null;
  bankName: string | null;
  accountNumber: string | null;
  faceIdRegistrationPhoto: string | null;
  createdAt: Date;
  isBurned: boolean;
  burnedAt: Date | null;
  loans: UserLoan[];
  points: number;
  isDeleted: boolean;
  deletedAt: Date | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

async function getUserDetails(id: string): Promise<UserDetails | null> {
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
    faceIdRegistrationPhoto: true,
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
        faceVerificationPhoto: true,
        faceMatchPassed: true,
        faceMatchCheckedAt: true,
        createdAt: true,
        disbursementSentAt: true,
      },
    },
  };

  try {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        ...baseSelect,
        points: true,
        isDeleted: true,
        deletedAt: true,
      } as any,
    }) as unknown as UserDetails | null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof (error as { code?: unknown })?.code === "string"
      ? String((error as { code?: string }).code)
      : "";
    const missingDeletedField = code === "P2022" || message.toLowerCase().includes("isdeleted");

    if (!message.includes("Unknown field `points`") && !missingDeletedField) {
      throw error;
    }

    const fallbackUser = await prisma.user.findUnique({
      where: { id },
      select: baseSelect as any,
    }) as unknown as Omit<UserDetails, "points" | "isDeleted" | "deletedAt"> | null;

    if (!fallbackUser) {
      return null;
    }

    return {
      ...fallbackUser,
      points: 0,
      isDeleted: false,
      deletedAt: null,
    } satisfies UserDetails;
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

  const paidLoans = user.loans.filter((loan) => loan.status === "PAID");
  const latestLoanWithFace = user.loans.find((loan) => Boolean(loan.faceVerificationPhoto));
  const totalLoansGivenToUser = user.loans
    .filter((loan) => loan.status === "PAID" || loan.disbursementSentAt != null)
    .reduce((sum, loan) => sum + loan.amount, 0);
  const onTimePayments = Math.min(paidLoans.length, Math.max(0, Math.floor((user.points ?? 0) / 100)));

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
            <p><span className="font-semibold">Total Loans Given:</span> R {totalLoansGivenToUser.toLocaleString("en-US")}</p>
            <p>
              <span className="font-semibold">Paid On Time:</span> {onTimePayments}
              <span className="text-xs text-gray-500"> (based on loyalty points and paid loans)</span>
            </p>
            <p>
              <span className="font-semibold">Access:</span>{" "}
              <span className={user.isBurned ? "text-red-700 font-semibold" : "text-green-700 font-semibold"}>
                {user.isBurned ? "Burned" : "Active"}
              </span>
            </p>
            <p>
              <span className="font-semibold">Deleted:</span>{" "}
              <span className={user.isDeleted ? "text-red-700 font-semibold" : "text-green-700 font-semibold"}>
                {user.isDeleted ? "Yes" : "No"}
              </span>
            </p>
            {user.burnedAt && (
              <p><span className="font-semibold">Burned At:</span> {user.burnedAt.toISOString().slice(0, 10)}</p>
            )}
            {user.deletedAt && (
              <p><span className="font-semibold">Deleted At:</span> {user.deletedAt.toISOString().slice(0, 10)}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <UpdateUserPointsForm userId={user.id} initialPoints={user.points} />
            <BurnUserButton userId={user.id} role={user.role} initialBurned={user.isBurned} />
            <SendUserMessageForm userId={user.id} isDeleted={Boolean(user.isDeleted)} isAdmin={user.role === "ADMIN"} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900">Face Match Comparison</h2>
        <p className="mt-1 text-xs text-gray-500">
          Registered face from first application vs latest live face used in loan verification.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FacePhotoCard label="Registered Face" photo={user.faceIdRegistrationPhoto ?? null} />
          <FacePhotoCard label="Latest Loan Live Face" photo={latestLoanWithFace?.faceVerificationPhoto ?? null} />
        </div>
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p><span className="font-semibold">Latest Match Result:</span> {latestLoanWithFace ? (latestLoanWithFace.faceMatchPassed ? "Matched" : "Not matched") : "N/A"}</p>
          <p><span className="font-semibold">Checked At:</span> {latestLoanWithFace?.faceMatchCheckedAt ? latestLoanWithFace.faceMatchCheckedAt.toISOString().slice(0, 19).replace("T", " ") : "N/A"}</p>
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
              <th className="px-4 py-3 font-semibold">Disbursed</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {user.loans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">No loans found.</td>
              </tr>
            ) : (
              user.loans.map((loan) => (
                <tr key={loan.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{loan.id}</td>
                  <td className="px-4 py-3 text-gray-700">R {loan.amount.toLocaleString("en-US")}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.termDays} days</td>
                  <td className="px-4 py-3 text-gray-700">{loan.status}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.rejectionReason ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.disbursementSentAt ? loan.disbursementSentAt.toISOString().slice(0, 10) : "-"}</td>
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

function FacePhotoCard({ label, photo }: { label: string; photo: string | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      {photo ? (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-black" style={{ aspectRatio: "3 / 4" }}>
          <img src={photo} alt={label} className="w-full h-full object-cover" />
        </div>
      ) : (
        <p className="mt-1 text-sm font-semibold text-gray-900">N/A</p>
      )}
    </div>
  );
}
