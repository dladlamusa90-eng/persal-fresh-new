import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import AppFooter from "@/app/components/AppFooter";

export default function ApplicationSubmittedPage() {
  return (
    <>
      <section className="relative min-h-screen bg-neutral-100 overflow-hidden">
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
            <div className="flex w-full max-w-5xl items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Persal Logo"
                  className="w-[100px] h-[100px] object-contain -my-5"
                  style={{ width: "100px", height: "100px" }}
                />
              </a>
              <nav className="flex gap-4 items-center">
                <Link href="/auth/login" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">
                  LogIn
                </Link>
              </nav>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-xl bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 md:p-12 shadow-sm text-center">
              <div className="flex justify-center mb-6">
                <CheckCircle2 className="text-teal-500" size={64} strokeWidth={1.5} />
              </div>

              <h1 className="text-2xl md:text-3xl text-gray-800 font-semibold mb-4">
                Signup Submitted
              </h1>

              <p className="text-gray-600 text-base md:text-lg mb-3">
                Thank you! Your signup has been received and is currently under review by our team.
              </p>

              <p className="text-gray-500 text-sm md:text-base mb-8">
                We will verify your Persal number and personal details. Once approved, you&apos;ll be able to LogIn and proceed with a loan application. This typically takes 1&ndash;2 business days.
              </p>

              <Link
                href="/auth/login"
                className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition"
              >
                LogIn
              </Link>
            </div>
          </div>
        </div>
      </section>
      <AppFooter />
    </>
  );
}
