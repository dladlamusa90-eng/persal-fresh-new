export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <section className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">Effective date: 12 May 2026</p>

        <p className="mt-4 text-slate-700 leading-7">
          Persal processes personal information in accordance with applicable South African data protection
          requirements, including POPIA, and related financial-services obligations.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Information We Collect</h2>
        <ul className="mt-2 list-disc pl-5 text-slate-700 leading-7 space-y-1">
          <li>Identity and contact details provided during registration or application.</li>
          <li>Affordability, employment, and banking information required for credit assessment and servicing.</li>
          <li>Application and account activity, repayment history, and support communications.</li>
          <li>Technical data such as device, browser, IP address, and security logs.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Why We Process Information</h2>
        <ul className="mt-2 list-disc pl-5 text-slate-700 leading-7 space-y-1">
          <li>To create and manage your account.</li>
          <li>To assess credit applications, perform affordability checks, and prevent fraud.</li>
          <li>To provide customer support and communicate notices about your account.</li>
          <li>To comply with legal, regulatory, and audit obligations.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Disclosure of Information</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Personal information may be shared with service providers, payment processors, regulators,
          credit bureaus, auditors, and other parties where required or permitted by law and for legitimate
          business operations.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Retention and Security</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Persal retains records for as long as reasonably necessary for operational, legal, and regulatory
          purposes. Appropriate technical and organizational safeguards are used to protect information against
          unauthorized access, loss, misuse, or alteration.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Your Rights</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Subject to applicable law, you may request access to your personal information, correction of
          inaccuracies, deletion where legally permissible, and objection to certain processing activities.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Contact</h2>
        <p className="mt-2 text-slate-700 leading-7">
          For privacy requests or complaints, email support@persal.co.za.
        </p>
      </section>
    </main>
  );
}
