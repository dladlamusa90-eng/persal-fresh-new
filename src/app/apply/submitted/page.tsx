"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SubmittedContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const isNewUser = searchParams.get("newUser") === "1";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Persal" className="h-12 object-contain" />
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Success card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-persal-dark px-6 py-8 text-center">
              <div className="w-16 h-16 bg-teal-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Application Submitted!</h1>
              <p className="text-teal-200 text-sm">We have received your loan application.</p>
            </div>

            <div className="px-6 py-6 space-y-4">
              {ref && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Application Reference</p>
                  <p className="font-mono text-sm font-semibold text-persal-dark">{ref}</p>
                </div>
              )}

              <div className="text-sm text-gray-600 space-y-2">
                <p>Our team will review your application and contact you within <strong>1–2 business days</strong>.</p>
                <p>If approved, funds will be transferred to your bank account promptly.</p>
              </div>

              {isNewUser && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-4">
                  <p className="text-orange-800 font-semibold text-sm mb-1">Account created for you</p>
                  <p className="text-orange-700 text-sm">
                    We have created a Persal account using your email. You can{" "}
                    <Link href="/auth/login" className="underline font-medium">LogIn</Link>{" "}
                    to track your application, earn points, and access more features.
                  </p>
                </div>
              )}

              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-4">
                <p className="text-teal-800 font-semibold text-sm mb-2">Want more from Persal?</p>
                <ul className="text-teal-700 text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    Earn points every time you repay on time
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    Join a stokvel savings group
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-teal-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    Higher loan limits as a returning customer
                  </li>
                </ul>
                <Link
                  href="/auth/signup?from=apply-submitted"
                  className="mt-3 inline-block w-full text-center bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition"
                >
                  Create Your Account
                </Link>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Link
                href="/"
                className="block w-full text-center border border-gray-300 text-gray-700 font-medium text-sm px-4 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ApplicationSubmittedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>}>
      <SubmittedContent />
    </Suspense>
  );
}
