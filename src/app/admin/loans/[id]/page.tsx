import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import {
  MIN_DISPOSABLE_INCOME_FOR_LOAN,
  getDisposableIncomeEligibility,
  getMaxLoanForUser,
  getTermMonths,
} from "@/lib/loanPolicy";
import ApplicationDecisionCard from "./ApplicationDecisionCard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminLoanApplicationPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      amount: true,
      termDays: true,
      applicationData: true,
      applicationDocuments: true,
      grossSalary: true,
      disposableIncome: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      disbursementSentAt: true,
      disbursementReference: true,
      applicantFullName: true,
      applicantEmail: true,
      applicantPhone: true,
      applicantIdNumber: true,
      applicantPersalNumber: true,
      applicantBankName: true,
      applicantAccountNumber: true,
      applicantAccountType: true,
      applicantBranchCode: true,
      faceRegistrationPhotoSnapshot: true,
      faceVerificationPhoto: true,
      faceMatchPassed: true,
      faceMatchCheckedAt: true,
    } as any,
  });

  if (!loan) {
    redirect("/admin");
  }

  const termMonths = getTermMonths(loan.termDays);
  const applicationData = (loan.applicationData ?? {}) as Record<string, string | number | null>;
  const applicationDocuments = (loan.applicationDocuments ?? {}) as Record<
    string,
    { name?: string; dataUrl?: string; type?: string; size?: number } | null
  >;
  const applicationStatementEntries = Object.entries(applicationData)
    .filter(([, value]) => value != null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  const applicationDocumentEntries = Object.entries(applicationDocuments)
    .filter(([, value]) => Boolean(value?.name || value?.dataUrl))
    .sort(([a], [b]) => a.localeCompare(b));
  const appliedOn = new Date(loan.createdAt as Date | string).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const previousLoanCount = await prisma.loan.count({
    where: { userId: loan.userId },
  });
  const maxByProfile = getMaxLoanForUser(previousLoanCount > 1);
  const affordability = getDisposableIncomeEligibility(loan.disposableIncome ?? 0, loan.amount, maxByProfile);
  const eligibilityNote =
    (loan.disposableIncome ?? 0) < MIN_DISPOSABLE_INCOME_FOR_LOAN
      ? `Not eligible: disposable income is below R${MIN_DISPOSABLE_INCOME_FOR_LOAN}.`
      : affordability.eligible
        ? `Eligible by disposable income rule. Max allowed is R${affordability.maxAllowed.toLocaleString()} (25% of disposable income).`
        : `Not eligible: requested amount exceeds affordability cap. Max allowed is R${affordability.maxAllowed.toLocaleString()} (25% of disposable income).`;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-persal-blue">Loan Application</h1>
          <p className="mt-2 text-sm text-gray-600">Review the full application before making a decision.</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Back to Admin
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Applicant Details</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Detail label="Full Name" value={loan.applicantFullName} />
            <Detail label="Email" value={loan.applicantEmail} />
            <Detail label="Phone" value={loan.applicantPhone} />
            <Detail label="ID Number" value={loan.applicantIdNumber} />
            <Detail label="Persal Number" value={loan.applicantPersalNumber} />
            <Detail label="Current Address" value={stringValue(applicationData.address)} />
            <Detail label="Applied On" value={appliedOn} />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8">Application Details</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Detail label="Requested Amount" value={`R ${loan.amount.toLocaleString()}`} />
            <Detail label="Term" value={`${termMonths} month${termMonths > 1 ? "s" : ""} (${loan.termDays} days)`} />
            <Detail label="Gross Salary" value={loan.grossSalary != null ? `R ${loan.grossSalary.toLocaleString()}` : null} />
            <Detail label="Disposable Income" value={loan.disposableIncome != null ? `R ${loan.disposableIncome.toLocaleString()}` : null} />
            <Detail label="Marital Status" value={stringValue(applicationData.maritalStatus)} />
            <Detail label="Home Status" value={stringValue(applicationData.homeStatus)} />
            <Detail label="Employment Status" value={stringValue(applicationData.employmentStatus)} />
            <Detail label="Employment Gross Income" value={moneyValue(applicationData.employmentGrossIncome)} />
            <Detail label="Employment Net Income" value={moneyValue(applicationData.employmentNetIncome)} />
            <Detail label="Income Frequency" value={stringValue(applicationData.incomeFrequency)} />
            <Detail label="Salary Day" value={stringValue(applicationData.salaryDay)} />
            <Detail label="Monthly Gross Income" value={moneyValue(applicationData.monthlyGrossIncome)} />
            <Detail label="Monthly Net Income" value={moneyValue(applicationData.monthlyNetIncome)} />
            <Detail label="Credit Repayments" value={moneyValue(applicationData.creditRepayments)} />
            <Detail label="Living Expenses" value={moneyValue(applicationData.livingExpenses)} />
            <Detail label="Calculated Disposable Income" value={moneyValue(applicationData.calculatedDisposableIncome)} />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8">Banking Details</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Detail label="Bank Name" value={loan.applicantBankName} />
            <Detail label="Account Number" value={loan.applicantAccountNumber} />
            <Detail label="Account Type" value={loan.applicantAccountType} />
            <Detail label="Branch Code" value={loan.applicantBranchCode} />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8">Uploaded Documents</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <DocumentCard label="Identity Document" document={applicationDocuments.identityDocument ?? null} />
            <DocumentCard label="Proof of Income" document={applicationDocuments.proofOfIncome ?? null} />
            <DocumentCard label="Proof of Residence" document={applicationDocuments.proofOfResidence ?? null} />
            <DocumentCard label="Bank Statement" document={applicationDocuments.bankStatement ?? null} />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8">Face Match Evidence</h2>
          <p className="mt-1 text-xs text-gray-500">
            Registered face from first application vs live face captured during this loan application.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FacePhotoCard label="Registered Face" photo={loan.faceRegistrationPhotoSnapshot} />
            <FacePhotoCard label="Loan Application Live Face" photo={loan.faceVerificationPhoto} />
          </div>
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Match Result:</span> {loan.faceMatchPassed ? "Matched" : "Not matched"}
            </p>
            <p>
              <span className="font-semibold">Checked At:</span> {loan.faceMatchCheckedAt ? loan.faceMatchCheckedAt.toISOString().slice(0, 19).replace("T", " ") : "N/A"}
            </p>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mt-8">Application Statement</h2>
          <p className="mt-1 text-xs text-gray-500">
            Complete captured payload for this application.
          </p>
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            {applicationStatementEntries.length === 0 ? (
              <p className="text-sm font-semibold text-gray-900">No additional captured fields.</p>
            ) : (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {applicationStatementEntries.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-gray-200 bg-white p-3">
                    <dt className="text-xs text-gray-500 break-all">{toLabel(key)}</dt>
                    <dd className="mt-1 font-semibold text-gray-900 break-all">{formatStatementValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">Captured Documents</p>
              {applicationDocumentEntries.length === 0 ? (
                <p className="mt-1 text-sm font-semibold text-gray-900">No documents captured.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-gray-800">
                  {applicationDocumentEntries.map(([key, doc]) => (
                    <li key={key} className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white border border-gray-200 px-2 py-1 text-xs text-gray-700">
                        {toLabel(key)}
                      </span>
                      <span className="font-medium">{doc?.name ?? "Document"}</span>
                      {doc?.size != null && (
                        <span className="text-xs text-gray-500">({Math.round(doc.size / 1024)} KB)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <ApplicationDecisionCard
          loanId={loan.id}
          status={loan.status}
          rejectionReason={loan.rejectionReason}
          disbursementSentAt={loan.disbursementSentAt?.toISOString() ?? null}
          disbursementReference={loan.disbursementReference}
          canApprove={affordability.eligible}
          eligibilityNote={eligibilityNote}
        />
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value || "N/A"}</p>
    </div>
  );
}

function DocumentCard({
  label,
  document,
}: {
  label: string;
  document: { name?: string; dataUrl?: string } | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      {document?.dataUrl ? (
        <div className="mt-2">
          <p className="text-sm font-semibold text-gray-900">{document.name ?? "Document"}</p>
          <a
            href={document.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center rounded-lg bg-persal-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-persal-dark"
          >
            View Document
          </a>
        </div>
      ) : (
        <p className="mt-1 text-sm font-semibold text-gray-900">N/A</p>
      )}
    </div>
  );
}

function stringValue(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  return String(value);
}

function moneyValue(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return `R ${amount.toLocaleString()}`;
}

function toLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatStatementValue(value: string | number | null) {
  if (value == null || value === "") return "N/A";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
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