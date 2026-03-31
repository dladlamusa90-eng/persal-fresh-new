import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import TransferLoanForm from "./TransferLoanForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TransferLoanPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      amount: true,
      applicantFullName: true,
      applicantBankName: true,
      applicantAccountNumber: true,
      applicantBranchCode: true,
      disbursementSentAt: true,
      disbursementReference: true,
    },
  });

  if (!loan) redirect("/admin");

  if (loan.status !== "APPROVED") {
    redirect(`/admin/loans/${id}`);
  }

  return (
    <section className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-persal-blue">Loan Transfer</h1>
          <p className="mt-2 text-sm text-gray-600">Complete the transfer after approving the application.</p>
        </div>
        <Link
          href={`/admin/loans/${id}`}
          className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Application
        </Link>
      </div>

      <TransferLoanForm
        loanId={loan.id}
        applicantName={loan.applicantFullName}
        bankName={loan.applicantBankName}
        accountNumber={loan.applicantAccountNumber}
        branchCode={loan.applicantBranchCode}
        requestedAmount={loan.amount}
        alreadyTransferred={Boolean(loan.disbursementSentAt)}
        existingReference={loan.disbursementReference}
      />
    </section>
  );
}