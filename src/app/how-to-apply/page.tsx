"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, Wallet, FileText, CheckCircle, Banknote } from "lucide-react";
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

export default function HowToApplyPage() {
  const [isClient, setIsClient] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<string>("loading");

  useEffect(() => {
    setIsClient(true);
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

  const steps = [
    {
      number: 1,
      title: "Describe your needs",
      description: "Decide how much money you need and when you want to repay it. Move the sliders on the homepage and decide exactly how much cash you need and after how many days you'd like to repay it. We'll show you the cost of your loan in real-time and once you're happy click the 'apply now' button.",
      icon: Wallet,
    },
    {
      number: 2,
      title: "Complete your application",
      description: "Complete an online application form. You will need to provide us with your personal information on your ID number, employment details, your Persal number and your bank account details.",
      icon: FileText,
    },
    {
      number: 3,
      title: "We verify your details",
      description: "We verify your income. Once your loan has been approved, we will need to verify your income. You will need to provide us with your most recent payslip or bank statement which clearly shows your personal details as well as your income. To find out more about what and how to upload, check out our 'How to Upload' guide.",
      icon: CheckCircle,
    },
    {
      number: 4,
      title: "Money transferred",
      description: "The money is transferred to your bank account. You will be send an email inside the system to verify your bank details are correct. The funds are available to you within 3 hours.",
      icon: Banknote,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-100">
      {isAuthenticated ? (
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
        <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
          <div className="flex w-full max-w-5xl items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Persal Logo" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: "100px", height: "100px" }} />
            </a>
            <nav className="flex gap-4 items-center">
              <a href="/auth/login" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">LogIn</a>
              <a href="/auth/signup?from=login" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">Sign Up</a>
            </nav>
          </div>
        </header>
      )}

      <main className="pb-4">
        <section className="max-w-5xl mx-auto px-4 md:px-6 mt-2 mb-8">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-persal-dark to-teal-800 px-6 py-8 md:px-8 md:py-10">
              <h1 className="text-3xl md:text-4xl font-semibold text-white">Applying is simple</h1>
              <p className="mt-3 text-teal-100 text-sm md:text-base max-w-3xl">
                Our simple 4-step application process makes it easy to apply for a Persal loan.
              </p>
            </div>

            <article className="px-6 md:px-8 py-7 text-gray-800">
              <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-gray-900">Get Started</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {steps.map((step) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={step.number} className="bg-teal-50 rounded-xl p-6 border border-teal-100">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-persal-blue text-white">
                          <IconComponent size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Step {step.number}</h3>
                      </div>
                      <h4 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
                    </div>
                  );
                })}
              </div>

              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-900">Short term credit</h2>
              <p className="text-sm leading-relaxed mb-6">
                We want to make you a quick offer. That way credit can start during any two minute, but Persal provides full info on how the credit terms will help you out of a 1 month, and if you&apos;re unsure, we can always figure out what may work for you.
              </p>

              <p className="text-sm leading-relaxed mb-6">
                Unlike some lenders or credit card providers, we won&apos;t keep extending your existing balance or encourage you to make minimum repayments. We plaintext back, you carefully review, think about your situation, and feel good about your choice.
              </p>

              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-900">Transparency</h2>
              <p className="text-sm leading-relaxed mb-6">
                We believe that our customers deserve the clearest view of what they will owe us. There are no all costs, upfront and in the application process, are clear transparent throughout the life of the credit facility.
              </p>

              <p className="text-sm leading-relaxed mb-6">
                No credit card or rate card is valid. Instead, we say what you must know and make certain that you will see the totality of your costs and realize what you are using to apply for the credit.
              </p>

              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-900">Failure to stick to your side of the deal</h2>
              <p className="text-sm leading-relaxed mb-6">
                The one way you will avoid issues are if you stick your side of the deal. If you don&apos;t stick to your side, the deal you will be in breach of your credit agreement and will have to pay penalties and interest. If you do not repay your credit, you may face court orders and you will find it challenging to get credit again in time.
              </p>

              <p className="text-sm leading-relaxed mb-6">
                We want to help make sure you can collect the money fast account help the financial system. If you are unable to make your payment let us know because we can make different terms possible. All the questions you have about late payment or defaulting are welcome if you are at any time unsure yourself about the repayment of the facility of the credit or your agreement to be able to do.
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
