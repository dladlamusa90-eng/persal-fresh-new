import React from "react";

const docs = [
  { name: "Payslip", status: "Verified" },
  { name: "ID Document", status: "Pending" },
  { name: "Bank Statement", status: "Verified" },
];

const statusColor = {
  "Verified": "bg-green-100 text-green-800",
  "Pending": "bg-yellow-100 text-yellow-800",
};

export default function DocumentsPage() {
  return (
    <section className="max-w-2xl mx-auto py-12">
      <h2 className="text-2xl font-semibold mb-6">Documents</h2>
      <ul className="space-y-4">
        {docs.map(doc => (
          <li key={doc.name} className="bg-white rounded-xl shadow p-6 border border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900">{doc.name}</div>
              <div className="text-xs text-gray-500">Upload Placeholder</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor[doc.status as keyof typeof statusColor]}`}>{doc.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
