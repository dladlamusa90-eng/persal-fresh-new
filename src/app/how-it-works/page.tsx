"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import AppFooter from "@/app/components/AppFooter";

export const dynamic = "force-dynamic";

const DropdownMenu = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <li className="relative group flex items-center h-[56px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 h-[56px] flex items-center justify-center rounded text-sm font-medium text-persal-dark hover:bg-teal-50 hover:text-persal-blue transition gap-1"
        style={{lineHeight: '56px', paddingTop: 0, paddingBottom: 0}}
      >
        <span className="flex items-center" style={{height: '24px'}}>{label}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <ul className="absolute left-0 top-full mt-0 bg-white border border-gray-200 rounded shadow-lg z-20">
          {children}
        </ul>
      )}
    </li>
  );
};

const DropdownMenuItem = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <li>
      <Link href={href} className="block px-4 py-2 text-sm text-persal-dark hover:bg-teal-50 hover:text-persal-blue transition">
        {children}
      </Link>
    </li>
  );
};

const dashboardMenu = [
  { name: "My Loan", href: "/dashboard" },
  { name: "My Details", href: "/dashboard/profile" },
  { name: "Support", href: "/dashboard/support" },
];

export default function HowItWorksPage() {
  const [isClient, setIsClient] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<string>("loading");

  useEffect(() => {
    setIsClient(true);
    // Get session on client side only
    async function getSession() {
      const session = await fetch("/api/auth/session").then(res => res.json());
      setSession(session);
      setStatus(session ? "authenticated" : "unauthenticated");
    }
    getSession();
  }, []);

  if (!isClient || status === "loading") {
    return null;
  }

  const isAuthenticated = status === "authenticated" && !!session?.user;

  return (
    <div className="min-h-screen bg-neutral-100">
      {isAuthenticated ? (
        // Authenticated header (dashboard style)
        <header className="w-full border-b border-gray-200 bg-white px-4 md:px-8">
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" aria-label="Go to My Loan">
                <img src="/logo.png" alt="Persal Logo" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: '100px', height: '100px' }} />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <ul className="flex gap-4 items-center h-[56px]">
                {dashboardMenu.map(item => (
                  <li key={item.href} className="flex items-center h-[56px]">
                    <Link
                      href={item.href}
                      className="px-4 h-[34px] flex items-center rounded-md text-sm font-medium transition text-black hover:bg-teal-50 hover:text-black"
                      style={{ lineHeight: "1.2" }}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="ml-4 px-4 py-2 bg-persal-blue text-white rounded-lg font-semibold text-sm shadow hover:bg-persal-dark transition"
                title="Logout and return to homepage"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
      ) : (
        // Public header (unauthenticated)
        <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
          <div className="flex w-full max-w-5xl items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Persal Logo" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: "100px", height: "100px" }} />
            </a>
            <nav className="flex gap-4 items-center">
              <a href="/auth/login" className="text-persal-dark font-medium px-4 py-2 rounded hover:bg-teal-50 transition">Login</a>
              <a href="/auth/signup?from=login" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">Apply</a>
            </nav>
          </div>
        </header>
      )}

      <main className="pb-4">
        <section className="max-w-5xl mx-auto px-4 md:px-6 mt-2 mb-8">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-persal-dark to-teal-800 px-6 py-8 md:px-8 md:py-10">
              <h1 className="text-3xl md:text-4xl font-semibold text-white">Short term loan</h1>
              <p className="mt-3 text-teal-100 text-sm md:text-base max-w-3xl">
                Clear guidance on Persal short term loans, eligibility requirements, and the full application process.
              </p>
            </div>

            <article className="px-6 md:px-8 py-7 text-gray-800">
              <p className="text-sm leading-relaxed mb-4">
                Short term loans are a common way of borrowing in South Africa and can be an alternative to traditional payday products. People usually apply online when they need funds quickly for emergency or unexpected costs.
              </p>
              <p className="text-sm leading-relaxed mb-4">
                These loans can help when you need cash for an urgent expense that was not planned for. However, many products in the market are expensive or hard to understand. Persal is focused on clear pricing, responsible lending, and simple repayment.
              </p>
              <p className="text-sm leading-relaxed mb-6">
                Sometimes you need short-term support for a quick cash gap. Persal gives you a transparent option designed for government employees, with fair terms and practical repayment expectations.
              </p>

              <h2 className="text-3xl md:text-[34px] font-normal mb-3 text-gray-900">Why are other short term loans so expensive?</h2>
              <p className="text-sm leading-relaxed mb-6">
                A lot of short term loan providers include extra charges and high costs that can make borrowing expensive. With Persal, we aim to keep the process straightforward and compliant with National Credit Regulations. Once approved, most customers can receive funds within a couple of hours.
              </p>

              <h2 className="text-3xl md:text-[34px] font-normal mb-3 text-gray-900">A short term loan that gives you financial freedom</h2>
              <p className="text-sm leading-relaxed mb-4">
                We advise that short term loans should be used for urgent or unexpected expenses only, and that you borrow only what you can comfortably repay in about a month.
              </p>
              <p className="text-sm leading-relaxed mb-6">
                If month-end pressure becomes difficult, Persal can help with short-term support so you can continue meeting your important commitments.
              </p>

              <h2 className="text-3xl md:text-[34px] font-normal mb-3 text-gray-900">How to apply for a Persal short term loan</h2>
              <p className="text-sm leading-relaxed mb-3">
                We designed the application process to be quick and easy. Follow these steps below.
              </p>
              <ol className="list-decimal pl-5 text-sm leading-relaxed mb-6 space-y-1">
                <li>Connect to our site using a mobile phone, tablet, or desktop PC.</li>
                <li>Create your account and log in.</li>
                <li>Specify your desired amount of Rand.</li>
                <li>Specify your desired repayment period.</li>
                <li>Complete your application via our secure form.</li>
                <li>Provide your most recent payslip or bank statement (not older than 60 days) as proof of income.</li>
                <li>If successful, your cash is sent to your bank account, typically within 3 hours.</li>
                <li>You pay back the loan with the agreed timeframe; early repayment is allowed and encouraged.</li>
              </ol>

              <p className="text-sm leading-relaxed mb-2">Conditions of the Persal term loan product</p>
              <ul className="list-disc pl-5 text-sm leading-relaxed mb-6 space-y-1">
                <li>Our short term loans are designed for short-term usage only; faster repayment can reduce your total borrowing cost.</li>
                <li>If your loan is repaid later than agreed terms, your application can be declined in future and your credit profile may be negatively affected.</li>
                <li>If you find yourself repeatedly using loans, short term finance may not be the right fit for you.</li>
                <li>To qualify, you must be a South African resident with a bank account in your own name, and be 18 years or older.</li>
              </ul>

              <h2 className="text-3xl md:text-[34px] font-normal mb-3 text-gray-900">What is Persal&apos;s credit selection criteria?</h2>
              <p className="text-sm leading-relaxed mb-2">
                Persal conducts an affordability and credit assessment for each applicant. Applicants must:
              </p>
              <ul className="list-disc pl-5 text-sm leading-relaxed mb-6 space-y-1">
                <li>Be South African residents aged 18 or older.</li>
                <li>Possess a valid South African ID number.</li>
                <li>Provide a valid Persal Number.</li>
                <li>Be South African government employees (public servants).</li>
                <li>Have an active bank account in their own name.</li>
                <li>Provide proof of regular income through a recent payslip or bank statement.</li>
                <li>Have access to a mobile phone.</li>
              </ul>
              <p className="text-sm leading-relaxed mb-6">
                These checks help ensure customers can borrow responsibly and repay their loans.
              </p>

              <h2 className="text-3xl md:text-[34px] font-normal mb-3 text-gray-900">How does Persal collect payments on short term loans?</h2>
              <p className="text-sm leading-relaxed mb-6">
                Persal collects repayments via approved payment methods on the agreed due date. Customers should ensure sufficient funds are available to avoid additional fees or penalties.
              </p>

              <h2 className="text-3xl md:text-[34px] font-normal mb-3 text-gray-900">What happens if I&apos;m unable to make my short-term loan repayment?</h2>
              <p className="text-sm leading-relaxed mb-6">
                If you are unable to make repayment, contact Persal immediately to discuss your situation. Late or missed payments can result in additional fees and may negatively affect your credit score.
              </p>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <Link href="/dashboard" className="inline-block bg-persal-blue text-white font-semibold px-5 py-2.5 rounded-lg shadow hover:bg-persal-dark transition">
                  Apply Now
                </Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <AppFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
