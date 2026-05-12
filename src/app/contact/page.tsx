export default function ContactPage() {
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <p className="mb-4">For support, questions, or feedback, please contact us using the details below:</p>
      <ul className="mb-6 list-disc pl-6">
        <li>Email: <a href="mailto:support@persal.co.za" className="text-persal-blue underline">support@persal.co.za</a></li>
        <li>Phone: <span className="text-persal-blue">+27 11 123 4567</span></li>
        <li>Address: <span className="text-persal-blue">123 Government Ave, Pretoria, South Africa</span></li>
      </ul>
      <h2 className="text-xl font-semibold mb-2">Business Hours</h2>
      <p>Monday to Friday: 8:00 AM – 5:00 PM<br/>Closed on weekends and public holidays.</p>
    </main>
  );
}
