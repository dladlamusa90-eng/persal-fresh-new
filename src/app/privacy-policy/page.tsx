export default function PrivacyPolicyPage() {
  return (
    <section className="max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-6">
      <h1 className="text-3xl font-bold text-persal-blue">Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: 26 February 2026</p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5 text-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">1. Information We Collect</h2>
          <p className="mt-2">We collect account information you provide, such as full name, email, phone number, Persal number, ID number, and bank details.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">2. How We Use Your Information</h2>
          <p className="mt-2">Your information is used to create and manage your account, process loan requests, and improve platform operations.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">3. Data Protection</h2>
          <p className="mt-2">We apply reasonable safeguards to protect your personal information against unauthorized access and misuse.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">4. Data Sharing</h2>
          <p className="mt-2">We do not sell personal information. Data may be shared only when required for service delivery or by law.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">5. Your Rights</h2>
          <p className="mt-2">You may request updates to your account details through your profile and contact support for privacy-related questions.</p>
        </div>
      </div>
    </section>
  );
}
