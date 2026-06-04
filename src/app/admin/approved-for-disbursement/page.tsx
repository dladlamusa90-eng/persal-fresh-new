import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import DisbursementQueue from "./DisbursementQueue";

export default async function ApprovedForDisbursementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const approvedLoans = await prisma.loan.findMany({
    where: {
      status: "APPROVED",
      disbursementSentAt: null,
    },
    select: {
      id: true,
      amount: true,
      termDays: true,
      applicantFullName: true,
      applicantEmail: true,
      applicantPersalNumber: true,
      applicantBankName: true,
      applicantAccountNumber: true,
      applicantBranchCode: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const serialized = approvedLoans.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return <DisbursementQueue initialLoans={serialized} />;
}
