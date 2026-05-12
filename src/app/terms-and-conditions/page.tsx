export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <section className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Terms and Conditions</h1>
        <p className="mt-3 text-sm text-slate-500">Effective date: 12 May 2026</p>

        <p className="mt-4 text-slate-700 leading-7">
          These terms govern access to and use of Persal digital services. By using this website or applying
          for a loan, you confirm that you accept these terms.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Use of the Platform</h2>
        <ul className="mt-2 list-disc pl-5 text-slate-700 leading-7 space-y-1">
          <li>You must provide accurate and complete information.</li>
          <li>You are responsible for keeping account credentials confidential.</li>
          <li>You may not use the platform for unlawful, fraudulent, or abusive activity.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Credit Applications and Agreements</h2>
        <p className="mt-2 text-slate-700 leading-7">
          All lending is subject to eligibility checks, affordability assessment, and verification. Any approved
          loan is governed by the specific pre-agreement statement, quotation, and signed agreement presented
          to you at the time of approval.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Fees, Interest, and Repayments</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Applicable fees, interest, and total repayment obligations are disclosed before acceptance.
          Repayment obligations remain enforceable in accordance with your loan agreement and applicable law.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Intellectual Property</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Website content, branding, and software components are protected by intellectual-property laws.
          No content may be reproduced or distributed without permission, except where legally permitted.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Limitation and Changes</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Persal may update services and these terms from time to time. Updated terms are effective upon
          publication unless a later date is stated.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Contact</h2>
        <p className="mt-2 text-slate-700 leading-7">
          For questions regarding these terms, email support@persal.co.za.
        </p>
      </section>
    </main>
  );
}
