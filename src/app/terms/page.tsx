export default function TermsPage() {
  return (
    <section className="max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-6">
      <h1 className="text-3xl font-bold text-persal-blue">Terms of Use</h1>
      <p className="text-sm text-gray-500">Last updated: 26 February 2026</p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5 text-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p className="mt-2">By using Persal, you agree to these Terms of Use and our Privacy Policy.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">2. Account Information</h2>
          <p className="mt-2">You must provide accurate details during registration, including your Persal number and contact information.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">3. Responsible Use</h2>
          <p className="mt-2">You may not misuse the platform, attempt unauthorized access, or submit false information.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">4. Loan Decisions</h2>
          <p className="mt-2">Loan approvals are subject to internal checks and eligibility requirements. Submission does not guarantee approval.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">5. Changes to Terms</h2>
          <p className="mt-2">We may update these Terms from time to time. Continued use of the platform means you accept the updated Terms.</p>
        </div>
      </div>
    </section>
  );
}
