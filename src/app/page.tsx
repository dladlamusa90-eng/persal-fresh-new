"use client";
import Link from "next/link";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import AppFooter from "@/app/components/AppFooter";
import { calculateLoanCharges } from "@/lib/loanPolicy";

const CAROUSEL_IMAGES = [
  { src: "/get-started.png", alt: "Get Started 1" },
  { src: "/get-started-2.png", alt: "Get Started 2" },
];

const HOW_IT_WORKS_STEPS = [
  {
    img: "/how-step1.png",
    alt: "Check Eligibility",
    link: "#calc",
    text: "Check Eligibility",
    desc: "Enter the loan amount and choose your month term to see your estimated offer.",
  },
  {
    img: "/how-step2.png",
    alt: "Apply Online",
    link: "/auth/login",
    text: "Apply Online",
    desc: "Complete your application securely online in minutes.",
  },
  {
    img: "/how-step3.png",
    alt: "Payroll Deduction",
    link: "#about-persal",
    text: "Payroll Deduction",
    desc: "Repayments are deducted directly from your salary for convenience and peace of mind.",
  },
];

function CarouselCTA() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx(i => (i + 1) % CAROUSEL_IMAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);
  const goNext = (e) => {
    e.stopPropagation();
    setIdx(i => (i + 1) % CAROUSEL_IMAGES.length);
  };
  return (
    <div className="relative w-full h-48 md:h-full">
      <img
        src={CAROUSEL_IMAGES[idx].src}
        alt={CAROUSEL_IMAGES[idx].alt}
        className="w-full h-48 md:h-full object-cover rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none shadow-none border-none bg-transparent transition-all duration-700"
        style={{ minHeight: '192px', maxHeight: '340px' }}
        loading="lazy"
      />
      <button
        onClick={goNext}
        aria-label="Next image"
        className="absolute right-2 bottom-2 bg-white/80 hover:bg-white text-teal-700 rounded-full p-2 shadow-md transition"
        style={{zIndex:2}}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  );
}

export default function Home() {
    // Animation: moving blue balls background
    React.useEffect(() => {
      const canvas = document.getElementById('bg-balls-canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      let rafId = 0;
      const particleCount = window.innerWidth < 768 ? 10 : 18;
      const balls = Array.from({ length: particleCount }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 18 + Math.random() * 18,
        dx: (Math.random() - 0.5) * 0.7,
        dy: (Math.random() - 0.5) * 0.7,
        color: `hsl(210, 80%, ${60 + Math.random() * 20}%)`
      }));
      let running = true;
      function animate() {
        if (!running) return;
        ctx.clearRect(0, 0, width, height);
        for (const b of balls) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
          ctx.fillStyle = b.color;
          ctx.globalAlpha = 0.18;
          ctx.fill();
          ctx.globalAlpha = 1;
          b.x += b.dx;
          b.y += b.dy;
          if (b.x < -b.r) b.x = width + b.r;
          if (b.x > width + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = height + b.r;
          if (b.y > height + b.r) b.y = -b.r;
        }
        rafId = requestAnimationFrame(animate);
      }
      animate();

      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          cancelAnimationFrame(rafId);
          return;
        }
        rafId = requestAnimationFrame(animate);
      };

      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        running = false;
        cancelAnimationFrame(rafId);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }, []);

  const maxLoan = 5000;
  const LOAN_CALC_AMOUNT_KEY = "loanCalculatorAmount";
  const LOAN_CALC_DAYS_KEY = "loanCalculatorDays";

  // Hydration check for urgent banner and calculator state
  const [hydrated, setHydrated] = useState(false);
  const [showTopAd, setShowTopAd] = useState(true);
  const [desiredLoan, setDesiredLoan] = useState(1500);
  const [selectedDays, setSelectedDays] = useState(60);
  useLayoutEffect(() => {
    const storedLoan = localStorage.getItem(LOAN_CALC_AMOUNT_KEY);
    if (storedLoan) {
      const v = parseInt(storedLoan, 10);
      if (!isNaN(v) && v >= 100 && v <= 5000) setDesiredLoan(v);
    }
    const storedDays = localStorage.getItem(LOAN_CALC_DAYS_KEY);
    if (storedDays) {
      const v = parseInt(storedDays, 10);
      if (!isNaN(v) && v >= 6 && v <= 90) setSelectedDays(v);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    const lastClosed = localStorage.getItem('persal-top-ad-last-closed');
    if (lastClosed) {
      const last = parseInt(lastClosed, 10);
      if (!isNaN(last)) {
        const now = Date.now();
        if (now - last < 30 * 60 * 1000) {
          setShowTopAd(false);
        }
      }
    }
  }, []);
  const [error, setError] = useState("");
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const repayDateInputRef = useRef<HTMLInputElement | null>(null);

  function updateDesiredLoan(value: number) {
    if (value < 100 || value > maxLoan) {
      setError("Loan amount must be between R100 and R5,000.");
    } else {
      setError("");
    }
    setDesiredLoan(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOAN_CALC_AMOUNT_KEY, value.toString());
    }
  }

  function updateSelectedDays(value: number) {
    const clamped = Math.max(6, Math.min(90, value));
    setSelectedDays(clamped);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOAN_CALC_DAYS_KEY, clamped.toString());
    }
  }

  const termDays = Math.max(6, Math.min(90, selectedDays));
  const term = Math.max(1, Math.min(3, Math.ceil(termDays / 30)));

  const {
    termMonths,
    interestMonth1,
    interestMonth2,
    interestMonth3,
    initiationFee,
    serviceFee,
    totalCost,
    totalRepayable,
    monthlyRepayment,
  } = calculateLoanCharges(desiredLoan, termDays);
  const totalInterest = interestMonth1 + interestMonth2 + interestMonth3;
  const totalFees = initiationFee + serviceFee;
  const amountPercent = ((desiredLoan - 100) / (5000 - 100)) * 100;
  const dayPercent = ((termDays - 6) / (90 - 6)) * 100;
  const amountKnobPercent = Math.min(97, Math.max(3, amountPercent));
  const dayKnobPercent = Math.min(97, Math.max(3, dayPercent));
  const repayDate = new Date();
  repayDate.setDate(repayDate.getDate() + termDays);
  const repayDateISO = repayDate.toISOString().split("T")[0];
  const repayDateDisplay = repayDateISO.replace(/-/g, "/");
  const repayDateLabelCompact = repayDate
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/\s+/g, "");

  function setDaysFromRepayDate(value: string) {
    if (!value) return;
    const selected = new Date(`${value}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rawDays = Math.ceil((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const clampedDays = Math.max(6, Math.min(90, rawDays));
    updateSelectedDays(clampedDays);
  }



  return (
    <>
      {/* Animated blue balls background (hidden on mobile) */}
      <canvas id="bg-balls-canvas" className="hidden md:block fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }} />
      <div className="relative z-10">
      {/* Top Bar (urgent message) */}
      {hydrated && showTopAd && (
          <div className="relative w-full bg-persal-dark text-teal-100 py-2 px-4 font-semibold text-xs md:text-sm tracking-wide" role="region" aria-label="Promotional banner">
            <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
              <div className="text-center flex-1">
                Need cash today?<br className="hidden md:block" />
                <span className="font-normal">Complete your application today and get cash in your account in under 24 hours!</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowTopAd(false);
                localStorage.setItem('persal-top-ad-last-closed', Date.now().toString());
              }}
              className="absolute top-0.5 right-2 md:right-3 text-teal-100 hover:text-white transition leading-none text-base md:text-lg"
              aria-label="Close promotional banner"
            >
              ×
            </button>
          </div>
      )}
      <div className="min-h-screen flex flex-col bg-transparent relative z-10">
        {/* Header with logo and auth buttons */}
        <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
          <div className="flex w-full max-w-5xl items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Persal Logo" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: '100px', height: '100px' }} />
            </a>
            <nav className="flex gap-4 items-center">
              <a
                href="/auth/login"
                className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition"
              >
                LogIn
              </a>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="w-full max-w-4xl mx-auto pt-10 pb-14 px-4 md:px-6">
          <div className="w-full">
            <div id="calc" className="bg-white rounded-2xl shadow-[0_-10px_18px_-16px_rgba(2,12,27,0.35),0_22px_42px_-22px_rgba(2,12,27,0.58),0_10px_18px_-14px_rgba(2,12,27,0.35)] overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12">
                <aside className="relative overflow-hidden md:col-span-4 bg-persal-dark text-white hidden md:block">
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute inset-0 bg-gradient-to-b from-teal-700/25 via-teal-800/10 to-transparent" />
                    <svg
                      viewBox="0 0 600 220"
                      className="absolute -bottom-4 left-0 w-full h-40 text-teal-300/25"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 120 C90 70 180 170 270 120 C360 70 450 170 540 120 C570 102 590 90 600 95 L600 220 L0 220 Z"
                        fill="currentColor"
                      />
                    </svg>
                    <svg
                      viewBox="0 0 600 220"
                      className="absolute -bottom-10 left-0 w-full h-44 text-teal-200/20"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 140 C90 95 180 190 270 140 C360 95 450 190 540 140 C570 122 590 110 600 116 L600 220 L0 220 Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div className="relative z-10 p-4 md:p-5 border-b border-white/20">
                    <h3 className="text-orange-300 font-semibold text-lg mb-2">What you can get</h3>
                    <p className="text-white/95 leading-relaxed text-sm md:text-base font-semibold break-words">
                      Customers can apply for up to <b>R5000</b>, and can earn points to reduce their interest.
                    </p>
                  </div>
                  <div className="relative z-10 p-4 md:p-5 border-b border-white/20 bg-teal-900/25">
                    <h3 className="text-orange-300 font-semibold text-lg mb-2">What you'll need:</h3>
                    <ul className="space-y-2 text-sm md:text-base text-white/95 break-words">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="7" y="2" width="10" height="20" rx="2" /><line x1="10" y1="5" x2="14" y2="5" /><line x1="12" y1="18" x2="12" y2="18" />
                        </svg>
                        <span>A cellphone number</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><line x1="13" y1="10" x2="18" y2="10" /><line x1="13" y1="14" x2="18" y2="14" />
                        </svg>
                        <span>SA ID number</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <line x1="7" y1="10" x2="17" y2="10" />
                          <line x1="7" y1="14" x2="13" y2="14" />
                        </svg>
                        <span>Persal number</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="3" y1="21" x2="21" y2="21" /><line x1="5" y1="21" x2="5" y2="10" /><line x1="9" y1="21" x2="9" y2="10" /><line x1="15" y1="21" x2="15" y2="10" /><line x1="19" y1="21" x2="19" y2="10" /><polygon points="12 3 2 10 22 10 12 3" />
                        </svg>
                        <span>3-months bank statement</span>
                      </li>
                    </ul>
                  </div>
                  <div className="relative z-10 p-4 md:p-5">
                    <h3 className="text-orange-300 font-semibold text-lg mb-2">How to apply</h3>
                    <ol className="space-y-2 text-sm md:text-base text-white/95 break-words">
                      <li><span className="text-orange-300 mr-2 font-bold">1</span>Choose the amount you need</li>
                      <li><span className="text-orange-300 mr-2 font-bold">2</span>Choose how long you will need to repay</li>
                      <li><span className="text-orange-300 mr-2 font-bold">3</span>Click <span className="font-bold">"Apply Now"</span> and proceed to finalise your loan</li>
                    </ol>
                  </div>
                </aside>

                <div className="md:col-span-8 bg-gray-50 flex flex-col h-full max-[480px]:min-w-0">
                  <div className="p-4 md:p-6 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-end">
                      <div className="flex flex-col">
                        <div className="text-base md:text-lg text-gray-700 mb-1 max-[480px]:text-sm">Loan Amount</div>
                        <div className="h-12 md:h-14 flex items-end max-[480px]:h-10">
                          <div className="text-4xl md:text-5xl font-normal text-persal-blue leading-none max-[480px]:text-3xl">{hydrated ? `R${desiredLoan}` : "---"}</div>
                        </div>
                        <div className="h-px bg-gray-300 mt-2" />
                      </div>
                      <div className="flex flex-col">
                        <div className="text-base md:text-lg text-gray-700 mb-1 max-[480px]:text-sm">Loan Period</div>
                        <div className="h-12 md:h-14 flex items-end max-[480px]:h-10">
                          <div className="inline-flex items-end gap-1.5 text-4xl md:text-5xl font-normal text-persal-blue leading-none max-[480px]:text-3xl">
                            <span>{hydrated ? termDays : "---"}</span>
                            <span className="text-xl md:text-2xl text-gray-700 font-normal leading-none max-[480px]:text-lg">{hydrated ? "days" : ""}</span>
                          </div>
                        </div>
                        <div className="h-px bg-gray-300 mt-2" />
                      </div>
                    </div>

                    <div className="mt-16 space-y-6 max-[480px]:mt-10 max-[480px]:space-y-5">
                      <div>
                        <div className="text-lg md:text-xl text-gray-700 mb-2 max-[480px]:text-base">How much do you need?</div>
                        <div className={`flex items-center gap-3 md:gap-4 max-[480px]:gap-2 transition-opacity duration-200 ${hydrated ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                          <button
                            type="button"
                            onClick={() => updateDesiredLoan(Math.max(100, desiredLoan - 100))}
                            className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7"
                            aria-label="Decrease amount"
                          >
                            <svg className="w-4 h-4 max-[480px]:w-3.5 max-[480px]:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                          <div className="relative flex-1 h-10 max-[480px]:h-9">
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full" />
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-persal-blue rounded-full" style={{ width: `${amountPercent}%` }} />
                            <input
                              id="desiredLoan"
                              type="range"
                              min={100}
                              max={5000}
                              step={100}
                              value={desiredLoan}
                              onChange={e => updateDesiredLoan(Number(e.target.value))}
                              onInput={e => updateDesiredLoan(Number((e.target as HTMLInputElement).value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-y"
                              style={{ touchAction: "pan-y" }}
                            />
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center pointer-events-none max-[480px]:w-8 max-[480px]:h-8"
                              style={{ left: `${amountKnobPercent}%` }}
                            >
                              <svg className="w-7 h-7 text-persal-blue max-[480px]:w-5.5 max-[480px]:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="10 8 6 12 10 16" />
                                <polyline points="14 8 18 12 14 16" />
                              </svg>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDesiredLoan(Math.min(5000, desiredLoan + 100))}
                            className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7"
                            aria-label="Increase amount"
                          >
                            <svg className="w-4 h-4 max-[480px]:w-3.5 max-[480px]:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="text-lg md:text-xl text-gray-700 mb-2 max-[480px]:text-base">Over how many days?</div>
                        <div className="mb-3 flex items-center gap-2 max-[480px]:flex-wrap max-[480px]:gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (repayDateInputRef.current && "showPicker" in repayDateInputRef.current) {
                                (repayDateInputRef.current as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                              } else {
                                repayDateInputRef.current?.focus();
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm inline-flex items-center gap-2 hover:bg-gray-50 transition max-[480px]:text-xs"
                            aria-label="Set repayment date"
                          >
                            <svg className="w-4 h-4 text-gray-500 max-[480px]:w-3.5 max-[480px]:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="5" width="18" height="16" rx="2" />
                              <line x1="16" y1="3" x2="16" y2="7" />
                              <line x1="8" y1="3" x2="8" y2="7" />
                              <line x1="3" y1="11" x2="21" y2="11" />
                            </svg>
                            <span>{repayDateDisplay}</span>
                          </button>
                          <span className="text-sm text-gray-600 max-[480px]:text-xs">Last repayment day</span>
                          <input
                            ref={repayDateInputRef}
                            type="date"
                            min={new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                            max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                            value={repayDateISO}
                            onChange={e => setDaysFromRepayDate(e.target.value)}
                            onClick={e => {
                              const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
                              input.showPicker?.();
                            }}
                            className="sr-only"
                          />
                        </div>
                        <div className={`flex items-center gap-3 md:gap-4 max-[480px]:gap-2 transition-opacity duration-200 ${hydrated ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                          <button
                            type="button"
                            onClick={() => updateSelectedDays(Math.max(6, termDays - 1))}
                            className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7"
                            aria-label="Decrease period"
                          >
                            <svg className="w-4 h-4 max-[480px]:w-3.5 max-[480px]:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                          <div className="relative flex-1 h-10 max-[480px]:h-9">
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex gap-1.5">
                              <div className="relative h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 h-full bg-persal-blue rounded-full"
                                  style={{ width: `${termDays <= 6 ? 0 : termDays >= 30 ? 100 : ((termDays - 6) / 24) * 100}%` }}
                                />
                              </div>
                              <div className="relative h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 h-full bg-persal-blue rounded-full"
                                  style={{ width: `${termDays <= 30 ? 0 : termDays >= 60 ? 100 : ((termDays - 30) / 30) * 100}%` }}
                                />
                              </div>
                              <div className="relative h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 h-full bg-persal-blue rounded-full"
                                  style={{ width: `${termDays <= 60 ? 0 : termDays >= 90 ? 100 : ((termDays - 60) / 30) * 100}%` }}
                                />
                              </div>
                            </div>
                            <input
                              id="termDays"
                              type="range"
                              min={6}
                              max={90}
                              step={1}
                              value={termDays}
                              onChange={e => updateSelectedDays(Number(e.target.value))}
                              onInput={e => updateSelectedDays(Number((e.target as HTMLInputElement).value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-y"
                              style={{ touchAction: "pan-y" }}
                            />
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center pointer-events-none max-[480px]:w-8 max-[480px]:h-8"
                              style={{ left: `${dayKnobPercent}%` }}
                            >
                              <svg className="w-7 h-7 text-persal-blue max-[480px]:w-5.5 max-[480px]:h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="10 8 6 12 10 16" />
                                <polyline points="14 8 18 12 14 16" />
                              </svg>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateSelectedDays(Math.min(90, termDays + 1))}
                            className="w-8 h-8 rounded-full border border-gray-300 bg-white text-persal-blue shadow-sm hover:bg-gray-100 transition flex items-center justify-center p-0 max-[480px]:w-7 max-[480px]:h-7"
                            aria-label="Increase period"
                          >
                            <svg className="w-4 h-4 max-[480px]:w-3.5 max-[480px]:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-3 md:gap-4 max-[480px]:gap-2" aria-hidden="true">
                          <div className="w-8" />
                          <div className="flex-1 grid grid-cols-3 text-[10px] md:text-[11px] text-gray-500/50 max-[480px]:text-[9px]">
                            <span className="text-center">1st Month</span>
                            <span className="text-center">2nd Month</span>
                            <span className="text-center">3rd Month</span>
                          </div>
                          <div className="w-8" />
                        </div>
                      </div>
                    </div>

                    {error && <div className="mt-4 text-red-600 font-semibold text-sm">{error}</div>}
                  </div>

                  <div className="bg-gray-200 px-4 md:px-6 py-6 md:py-7 grid grid-cols-1 md:grid-cols-4 gap-4 items-center mt-auto border-t border-gray-300/70 min-h-[132px]">
                    <div className="flex flex-col items-center text-center">
                      <div className="text-base md:text-lg text-persal-blue font-semibold leading-tight tracking-tight">R{monthlyRepayment.toFixed(2)}</div>
                      <div className="text-xs text-gray-700 leading-tight mt-1 font-medium">Monthly repayment</div>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="text-base md:text-lg text-gray-700 leading-tight tracking-tight">{repayDateLabelCompact}</div>
                      <div className="text-xs text-gray-700 leading-tight mt-1 font-medium">Final repayment date</div>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="text-base md:text-lg text-gray-700 leading-tight tracking-tight inline-flex items-center gap-1">
                        <span>R{totalCost.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setShowFeeBreakdown(true)}
                          className="text-orange-500 hover:text-orange-600"
                          aria-label="Open interest and fees breakdown"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <line x1="12" y1="10" x2="12" y2="16" />
                            <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-xs text-gray-700 leading-tight mt-1 font-medium">Interest & Fees</div>
                    </div>
                    <div className="text-center md:text-right">
                      <Link
                        href={!error && desiredLoan >= 100 ? `/apply?loan=${desiredLoan}&termDays=${termDays}` : "#"}
                        className={`inline-block px-4 py-2 rounded-lg font-semibold text-base transition text-center max-[480px]:w-full ${!error && desiredLoan >= 100 ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer' : 'bg-gray-300 text-gray-400 cursor-not-allowed pointer-events-none'}`}
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showFeeBreakdown && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-label="Fees Breakdown">
              <div className="w-full max-w-sm rounded-xl overflow-hidden bg-gray-100 shadow-2xl border border-gray-200">
                <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
                  <h3 className="font-semibold text-base">Fees Breakdown</h3>
                  <button
                    type="button"
                    onClick={() => setShowFeeBreakdown(false)}
                    className="text-white text-xl leading-none"
                    aria-label="Close fees breakdown"
                  >
                    ×
                  </button>
                </div>
                <div className="px-4 py-3 text-persal-blue font-semibold border-b border-gray-200">
                  R{monthlyRepayment.toFixed(2)} x {termMonths} monthly repayments
                </div>
                <div className="divide-y divide-gray-200 text-sm">
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Monthly repayments</span><span className="font-semibold text-gray-700">{termMonths} x R{monthlyRepayment.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Initiation fee</span><span className="font-semibold text-gray-700">R{initiationFee.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Service fee</span><span className="font-semibold text-gray-700">R{serviceFee.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Total fees</span><span className="font-semibold text-gray-700">R{totalFees.toFixed(2)}</span></div>
                  <div className="px-4 py-3 flex items-center justify-between"><span className="text-gray-700">Total interest</span><span className="font-semibold text-gray-700">R{totalInterest.toFixed(2)}</span></div>
                </div>
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-persal-blue font-semibold">
                  <span>Total to repay</span>
                  <span>R{totalRepayable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </section>
        {/* How It Works (3 steps) */}
        <section className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 mb-12 mt-8">
          <h2 className="text-2xl font-bold text-persal-dark mb-6 text-center">How It Works</h2>
          <div className="flex flex-col md:flex-row gap-8 md:gap-0 justify-between items-stretch md:items-start">
            {HOW_IT_WORKS_STEPS.map((step, idx) => (
              <div
                key={step.text}
                className={`flex-1 flex flex-col items-center px-2 md:px-6 py-4 md:py-0 justify-between h-full${idx < 2 ? ' md:border-r md:border-gray-200' : ''}`}
              >
                <img src={step.img} alt={step.alt} className="w-20 h-20 object-contain rounded-full bg-teal-50 border border-teal-100 mb-2" loading="lazy" />
                <Link href={step.link} className="text-lg font-semibold text-black mb-1 hover:underline cursor-pointer text-center" style={{minHeight:'2.5rem', display:'flex', alignItems:'center', justifyContent:'center'}}>{step.text}</Link>
                <div className="text-gray-600 text-center" style={{minHeight:'3.5rem', display:'flex', alignItems:'center', justifyContent:'center'}}>{step.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* About Persal Section */}
        <section className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 mb-12 mt-8 flex flex-col md:flex-row items-center gap-8">
          <section id="about-persal" className="flex-1 flex justify-center">
            <img src="/about-persal.jpg" alt="About Persal" className="w-72 h-72 max-w-full object-cover rounded-xl bg-teal-50 border border-persal-light shadow-md" loading="lazy" />
          </section>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-persal-dark mb-4">About Persal</h2>
            <p className="text-gray-700 mb-3">
              Persal is dedicated to providing fast, transparent, and responsible payroll loans to South African government employees. Our mission is to empower you with access to fair credit, simple application processes, and peace of mind through payroll deduction.
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Trusted by thousands of public servants</li>
              <li>Compliant with NCR and payroll regulations</li>
              <li>Local support and quick payouts</li>
            </ul>
          </div>
        </section>

        {/* Testimonials / Social Proof Section */}
        <section className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 mb-12 mt-8">
          <h2 className="text-2xl font-bold text-persal-dark mb-6 text-center">What Our Clients Say</h2>
          <div className="flex flex-col md:flex-row gap-8 justify-between items-stretch">
            {/* Testimonial 1 */}
            <div className="flex-1 flex flex-col items-center bg-teal-50 rounded-xl p-6 shadow-sm">
              <img src="/client-1.png" alt="Client 1" className="w-16 h-16 object-cover rounded-full mb-3 border border-persal-light" loading="lazy" />
              <div className="text-gray-800 font-semibold mb-1">Nomsa M.</div>
              <div className="text-gray-600 text-center text-sm mb-2">"The process was so quick and easy. I got my loan approved in a day and repayments are stress-free!"</div>
              <div className="text-persal-blue text-xs font-medium">Department of Health</div>
            </div>
            {/* Testimonial 2 */}
            <div className="flex-1 flex flex-col items-center bg-teal-50 rounded-xl p-6 shadow-sm">
              <img src="/client-2.png" alt="Client 2" className="w-16 h-16 object-cover rounded-full mb-3 border border-persal-light" loading="lazy" />
              <div className="text-gray-800 font-semibold mb-1">Thabo K.</div>
              <div className="text-gray-600 text-center text-sm mb-2">"Persal really cares about public servants. The support team was helpful and the rates are fair."</div>
              <div className="text-persal-blue text-xs font-medium">Department of Education</div>
            </div>
            {/* Testimonial 3 */}
            <div className="flex-1 flex flex-col items-center bg-teal-50 rounded-xl p-6 shadow-sm">
              <img src="/client-3.png" alt="Client 3" className="w-16 h-16 object-cover rounded-full mb-3 border border-persal-light" loading="lazy" />
              <div className="text-gray-800 font-semibold mb-1">Lindiwe S.</div>
              <div className="text-gray-600 text-center text-sm mb-2">"I love that repayments come straight from my salary. No stress, no missed payments!"</div>
              <div className="text-persal-blue text-xs font-medium">SAPS</div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-stretch gap-0 mb-12 mt-8">
          <section className="flex-1 bg-persal-blue rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none shadow p-8 flex flex-col items-start justify-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
            <p className="text-teal-100 mb-5">Apply for your Persal payroll loan today and experience fast, fair, and stress-free borrowing.</p>
          </section>
          <div className="flex-1 flex items-stretch">
            {/* Sliding image carousel */}
            <CarouselCTA />
          </div>
        </div>

        {/* Subscribe Section */}
        <section className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow p-8 mb-12 mt-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-teal-800 mb-3 text-center">Stay Informed</h2>
          <p className="text-gray-600 mb-5 text-center">Subscribe to receive updates, financial tips, and special offers from Persal.</p>
          <form className="w-full flex flex-col sm:flex-row gap-3 justify-center items-center">
            <input
              type="email"
              required
              placeholder="Your email address"
              className="flex-1 px-4 py-3 rounded-lg border border-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 bg-teal-50"
            />
            <button
              type="submit"
              className="bg-teal-700 text-white font-semibold px-6 py-3 rounded-lg shadow hover:bg-teal-800 transition"
            >
              Subscribe
            </button>
          </form>
        </section>

        <AppFooter />
      </div>
    </div>
  </>
  );
}

