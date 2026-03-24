"use client";

type StatementData = {
  user: {
    fullName: string;
    email: string;
    phone: string | null;
    idNumber: string | null;
    persalNumber: string | null;
    bankName: string | null;
    accountNumber: string | null;
    points: number;
    joinedAt: string;
  };
  loans: Array<{
    id: string;
    amount: number;
    termDays: number;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
  }>;
  paymentHistory: Array<{
    date: string;
    amount: string;
  }>;
};

type Props = {
  statementData: StatementData;
};

function formatMoney(amount: number) {
  return `R ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

export default function StatementDownloadButton({ statementData }: Props) {
  async function handleDownload() {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 16;

    function ensureSpace(extra = 8) {
      if (y + extra > pageHeight - 12) {
        doc.addPage();
        y = 16;
      }
    }

    function heading(text: string) {
      ensureSpace(10);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(text, 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    }

    function line(label: string, value: string) {
      ensureSpace(7);
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 58, y);
      y += 6;
    }

    const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Loan Statement", 14, y);
    y += 9;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    line("Generated At", generatedAt);
    line("Statement Holder", statementData.user.fullName || "N/A");

    heading("Account Details");
    line("Full Name", statementData.user.fullName || "N/A");
    line("Email", statementData.user.email || "N/A");
    line("Phone", statementData.user.phone ?? "N/A");
    line("ID Number", statementData.user.idNumber ?? "N/A");
    line("Persal Number", statementData.user.persalNumber ?? "N/A");
    line("Bank Name", statementData.user.bankName ?? "N/A");
    line("Account Number", statementData.user.accountNumber ?? "N/A");
    line("Points", String(statementData.user.points ?? 0));
    line("Date Joined", formatDate(statementData.user.joinedAt));

    heading("Loan Records");

    if (statementData.loans.length === 0) {
      line("Loans", "No loans found");
    } else {
      statementData.loans.forEach((loan, index) => {
        ensureSpace(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Loan ${index + 1} (${loan.id})`, 14, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        line("Amount", formatMoney(loan.amount));
        line("Term", `${loan.termDays} days`);
        line("Status", loan.status);
        line("Created", formatDate(loan.createdAt));
        line("Rejection Reason", loan.rejectionReason ?? "-");
        y += 2;
      });
    }

    heading("Payment History");

    if (statementData.paymentHistory.length === 0) {
      line("Payments", "No payments recorded yet");
    } else {
      statementData.paymentHistory.forEach((payment, index) => {
        line(`Payment ${index + 1}`, `${payment.date} | ${payment.amount}`);
      });
    }

    const filename = `loan-statement-${formatDate(generatedAt)}.pdf`;
    doc.save(filename);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-6 py-3 font-semibold text-lg shadow transition"
    >
      Download Statement
    </button>
  );
}
