export default function PaiaManualPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <section className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">PAIA Manual</h1>
        <p className="mt-3 text-sm text-slate-500">Effective date: 12 May 2026</p>

        <p className="mt-4 text-slate-700 leading-7">
          This page outlines how to request access to records in terms of the Promotion of Access to
          Information Act (PAIA), 2000.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">How to Submit a PAIA Request</h2>
        <ul className="mt-2 list-disc pl-5 text-slate-700 leading-7 space-y-1">
          <li>Send your request to support@persal.co.za with subject: PAIA Request.</li>
          <li>Include your full name, contact details, and description of the records required.</li>
          <li>State the reason for the request and preferred format of access.</li>
          <li>Provide proof of identity and authority where applicable.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Request Assessment</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Requests are assessed in line with PAIA requirements, including grounds for granting or refusing
          access, protection of confidential information, and rights of third parties.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Fees and Timelines</h2>
        <p className="mt-2 text-slate-700 leading-7">
          Prescribed request and reproduction fees may apply. Response timelines follow PAIA and may be
          extended as permitted by law where necessary.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-900">Assistance</h2>
        <p className="mt-2 text-slate-700 leading-7">
          For help with a PAIA submission, contact support@persal.co.za.
        </p>
      </section>
    </main>
  );
}
