"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, FileText, ClipboardList, Phone, Mail, MessageSquare, Clock, AlertCircle, CheckCircle2, HelpCircle, CreditCard, Calendar } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "How do I check my loan application status?",
    a: "Go to My Loan → Loan Summary from the dashboard. Your current application status (Pending, Approved, Active, or Rejected) will be shown there along with the reason if declined.",
  },
  {
    q: "When will my loan be disbursed after approval?",
    a: "Once approved and your debit mandate is signed, funds are typically disbursed within 1–2 business days directly to your registered bank account.",
  },
  {
    q: "How are repayments collected?",
    a: "Repayments are collected via a debit order from your bank account on your chosen repay day each month. Ensure your account is funded to avoid failed debit fees.",
  },
  {
    q: "Can I apply for a new loan while I have an active one?",
    a: "No. You may only hold one active Persal loan at a time. Once your current loan is fully settled, you can apply for a new one.",
  },
  {
    q: "How do I get a settlement letter or paid-up letter?",
    a: "Email us at support@persal.co.za with your full name, ID number, and PERSAL number. We'll generate and send the letter within 2 business days.",
  },
  {
    q: "What happens if a repayment is missed?",
    a: "A failed debit fee may apply and the missed instalment will be carried forward. Please contact us immediately if you anticipate payment difficulties so we can assist.",
  },
  {
    q: "How do I update my banking details?",
    a: "Contact our support team via email or phone with your updated banking details and proof of account. Changes require verification before taking effect.",
  },
  {
    q: "What is the maximum loan amount I can apply for?",
    a: "The maximum loan amount is R5,000, subject to your affordability assessment and PERSAL employment verification.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left text-gray-800 hover:text-persal-blue transition group"
      >
        <span className="text-[15px] md:text-[16px] font-medium leading-snug">{q}</span>
        <span className="mt-0.5 shrink-0 text-gray-400 group-hover:text-persal-blue transition">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <p className="pb-4 text-[15px] md:text-[16px] text-gray-600 leading-relaxed pr-8">{a}</p>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <section className="max-w-3xl mx-auto py-3 md:py-6">

      {/* Header */}
      <h1 className="text-[30px] md:text-[34px] leading-none font-normal mb-1 text-gray-800">Support</h1>
      <p className="text-gray-500 mb-6 text-[15px]">How can we help you today?</p>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: ClipboardList, label: "Loan Status", href: "/dashboard/lending/application-status", color: "text-persal-blue" },
          { icon: FileText, label: "Loan Documents", href: "/dashboard", color: "text-teal-600" },
          { icon: CreditCard, label: "Apply for Loan", href: "/dashboard/lending/apply", color: "text-orange-500" },
          { icon: Calendar, label: "My Details", href: "/dashboard/profile", color: "text-purple-500" },
        ].map(({ icon: Icon, label, href, color }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-gray-200 hover:border-persal-blue hover:shadow-sm transition text-center group"
          >
            <Icon size={22} className={`${color} group-hover:scale-110 transition-transform`} />
            <span className="text-[13px] text-gray-700 font-medium leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* Status indicators */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="text-[17px] font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-500" /> Service Status
        </h2>
        <div className="space-y-2">
          {[
            { label: "Loan Applications", status: "Operational" },
            { label: "Disbursements", status: "Operational" },
            { label: "Debit Orders", status: "Operational" },
          ].map(({ label, status }) => (
            <div key={label} className="flex items-center justify-between text-[14px]">
              <span className="text-gray-600">{label}</span>
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 md:p-6 mb-6">
        <h2 className="text-[20px] md:text-[22px] font-normal text-gray-800 mb-1 flex items-center gap-2">
          <HelpCircle size={20} className="text-persal-blue" /> Frequently Asked Questions
        </h2>
        <p className="text-[14px] text-gray-500 mb-4">Answers to the most common questions about your loan.</p>
        <div>
          {FAQ_ITEMS.map(item => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 md:p-6 mb-6">
        <h2 className="text-[20px] md:text-[22px] font-normal text-gray-800 mb-1">Contact Us</h2>
        <p className="text-[14px] text-gray-500 mb-5">Our team is available Monday–Friday, 08:00–17:00 SAST.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="tel:+27100123456"
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-persal-blue hover:bg-blue-50/30 transition group"
          >
            <span className="mt-0.5 p-2 rounded-lg bg-persal-blue/10 text-persal-blue group-hover:bg-persal-blue group-hover:text-white transition">
              <Phone size={16} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-gray-700">Call us</div>
              <div className="text-[13px] text-persal-blue mt-0.5">010 012 3456</div>
              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={10} /> Mon–Fri 08:00–17:00</div>
            </div>
          </a>

          <a
            href="mailto:support@persal.co.za"
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-persal-blue hover:bg-blue-50/30 transition group"
          >
            <span className="mt-0.5 p-2 rounded-lg bg-teal-500/10 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition">
              <Mail size={16} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-gray-700">Email us</div>
              <div className="text-[13px] text-persal-blue mt-0.5 break-all">support@persal.co.za</div>
              <div className="text-[11px] text-gray-400 mt-0.5">We reply within 1 business day</div>
            </div>
          </a>

          <button
            type="button"
            onClick={() => {
              const btn = document.querySelector<HTMLButtonElement>("[data-live-chat]");
              btn?.click();
            }}
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-persal-blue hover:bg-blue-50/30 transition group text-left"
          >
            <span className="mt-0.5 p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition">
              <MessageSquare size={16} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-gray-700">Live Chat</div>
              <div className="text-[13px] text-persal-blue mt-0.5">Chat with an agent</div>
              <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={10} /> Mon–Fri 08:00–17:00</div>
            </div>
          </button>
        </div>
      </div>

      {/* Escalation note */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-800">
        <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-500" />
        <p>
          For complaints or escalations, email <a href="mailto:complaints@persal.co.za" className="underline font-medium">complaints@persal.co.za</a>.
          We aim to resolve all complaints within 5 business days in accordance with the National Credit Act.
        </p>
      </div>

    </section>
  );
}
