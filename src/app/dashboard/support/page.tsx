"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function SupportPage() {
  const [isContactOpen, setIsContactOpen] = useState(true);

  return (
    <section className="max-w-6xl mx-auto py-3 md:py-6">
      <div className="text-gray-800">
        <h1 className="text-[30px] md:text-[34px] leading-none font-normal mb-4">Help</h1>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8 mb-6">
          <h2 className="text-[26px] md:text-[30px] leading-[1.1] font-normal mb-4">We&rsquo;re here to help</h2>

          <p className="text-[17px] md:text-[18px] leading-[1.5] text-gray-700 mb-5">
            Check your latest loan application status, loan balances, statements, and more!
          </p>

          <p className="text-[17px] md:text-[18px] leading-[1.5] text-gray-700 mb-3">
            Simply <a href="#" className="text-persal-blue hover:underline">login</a> to your account to view a variety of self-service features, including:
          </p>

          <ul className="list-disc pl-6 text-[17px] md:text-[18px] leading-[1.5] text-gray-700 space-y-1">
            <li>Loan application status</li>
            <li>Current loan balance</li>
            <li>Account statements</li>
            <li>Paid-up letters</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8 mb-6">
          <h2 className="text-[26px] md:text-[30px] leading-[1.1] font-normal mb-3">Need more help? Contact us</h2>

          <p className="text-[17px] md:text-[18px] leading-[1.5] text-gray-700 mb-5">
            Visit our <a href="#" className="text-persal-blue hover:underline">FAQ</a> for answers to common questions. For settlement letters, please contact us.
          </p>

          <div className="w-full rounded-md border border-gray-300 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setIsContactOpen((prev) => !prev)}
              className="w-full px-5 py-4 bg-gray-100 text-[18px] md:text-[20px] text-gray-800 flex items-center justify-between hover:bg-gray-200 transition"
              aria-expanded={isContactOpen}
              aria-label="Toggle contact options"
            >
              <span>Get in touch with us</span>
              {isContactOpen ? (
                <ChevronUp size={24} className="text-persal-blue" />
              ) : (
                <ChevronDown size={24} className="text-persal-blue" />
              )}
            </button>

            {isContactOpen && (
              <>
                <div className="px-5 py-4 text-[16px] md:text-[18px] text-persal-blue">
                  <a href="tel:+27821234567" className="hover:underline">+ Call us:</a>
                </div>

                <div className="mx-5 border-t border-gray-300" />

                <div className="px-5 py-4 text-[16px] md:text-[18px] text-persal-blue">
                  <a href="mailto:support@persal.co.za" className="hover:underline">+ Email us</a>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-gradient-to-r from-white to-teal-50/40 p-6 md:p-8">
          <h2 className="text-[26px] md:text-[30px] leading-[1.1] font-normal mb-3">Let&apos;s learn together!</h2>
          <p className="text-[17px] md:text-[18px] leading-[1.5] text-gray-700">
            Learn the four pillars of personal finance, check out the <a href="#" className="text-persal-blue hover:underline">Money Academy</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
