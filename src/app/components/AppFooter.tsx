import React from "react";
import { Facebook, Instagram, Linkedin } from "lucide-react";

type AppFooterProps = {
  isAuthenticated?: boolean;
};

export default function AppFooter({ isAuthenticated = false }: AppFooterProps) {
  return (
    <footer className="w-full bg-[#0c5c5f] text-teal-100 py-10 mt-12 max-[480px]:py-6 max-[480px]:mt-8">

      {/* ── Mobile layout (≤480px) ─────────────────────────────── */}
      <div className="md:hidden px-5 flex flex-col gap-5">

        {/* Row 1: brand left, copyright right */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-white">Persal</span>
          <span className="text-xs text-teal-100/80">&copy; {new Date().getFullYear()} Persal</span>
        </div>

        {/* Row 2: nav links — left column left-aligned, right column right-aligned */}
        <nav className="flex gap-4 text-sm">
          <div className="flex-1 flex flex-col gap-2">
            <a href="/about" className="hover:underline">About</a>
            <a href="mailto:support@persal.co.za" className="hover:underline">Contact</a>
            <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
            <a href="/paia-manual" className="hover:underline">PAIA Manual</a>
          </div>
          <div className="flex-1 flex flex-col gap-2 text-right">
            <a href="/how-it-works" className="hover:underline">How It Works</a>
            {!isAuthenticated && <a href="/auth/login" className="hover:underline">Log In</a>}
            <a href="/terms-and-conditions" className="hover:underline">Terms &amp; Conditions</a>
            <a href="/ncr-disclosures" className="hover:underline">NCR Disclosures</a>
          </div>
        </nav>

        {/* Row 3: email subscribe */}
        <form className="flex items-center gap-2" action="#" method="post">
          <input
            type="email"
            name="communityEmail"
            required
            placeholder="Join our community"
            className="flex-1 rounded-md border border-teal-200/40 bg-white/95 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold px-4 py-2 transition shrink-0"
          >
            Join
          </button>
        </form>

        {/* Row 4: social icons centred */}
        <div className="flex items-center justify-center gap-6 pt-1">
          <a href="#" aria-label="Facebook" className="text-teal-100 hover:text-white transition">
            <Facebook size={20} />
          </a>
          <a href="#" aria-label="Instagram" className="text-teal-100 hover:text-white transition">
            <Instagram size={20} />
          </a>
          <a href="#" aria-label="X" className="text-teal-100 hover:text-white transition">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M18.901 2H22l-6.764 7.73L23 22h-6.094l-4.771-6.224L6.69 22H3.588l7.236-8.268L1 2h6.248l4.313 5.683L18.901 2zm-1.085 18.13h1.717L6.314 3.772H4.472L17.816 20.13z" />
            </svg>
          </a>
          <a href="#" aria-label="LinkedIn" className="text-teal-100 hover:text-white transition">
            <Linkedin size={20} />
          </a>
        </div>
      </div>

      {/* ── Desktop layout (md+) ───────────────────────────────── */}
      <div className="hidden md:grid max-w-6xl mx-auto grid-cols-3 gap-8 px-4">
        <div className="flex flex-col items-start">
          <span className="font-bold text-xl mb-2 text-white">Persal</span>
          <span className="text-sm text-teal-100/90">&copy; {new Date().getFullYear()} Persal. All rights reserved.</span>
        </div>

        <nav className="flex flex-row flex-wrap gap-3 md:gap-5 text-sm items-start justify-center">
          <a href="/about" className="hover:underline">About</a>
          <a href="/how-it-works" className="hover:underline">How It Works</a>
          {!isAuthenticated && <a href="/auth/login" className="hover:underline">LogIn</a>}
          <a href="mailto:support@persal.co.za" className="hover:underline">Contact</a>
          <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
          <a href="/terms-and-conditions" className="hover:underline">Terms &amp; Conditions</a>
          <a href="/paia-manual" className="hover:underline">PAIA Manual</a>
          <a href="/ncr-disclosures" className="hover:underline">NCR Disclosures</a>
        </nav>

        <div id="join-our-community" className="flex flex-col items-end">
          <span className="text-white font-semibold mb-2">Join our community</span>
          <form className="w-auto flex items-center gap-2 mb-3" action="#" method="post">
            <input
              type="email"
              name="communityEmail"
              required
              placeholder="Enter your email"
              className="w-56 rounded-md border border-teal-200/40 bg-white/95 px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            <button
              type="submit"
              className="rounded-md bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold px-3 py-1.5 transition"
            >
              Join
            </button>
          </form>
          <div className="flex items-center gap-4">
            <a href="#" aria-label="Facebook" className="text-teal-100 hover:text-white transition"><Facebook size={18} /></a>
            <a href="#" aria-label="Instagram" className="text-teal-100 hover:text-white transition"><Instagram size={18} /></a>
            <a href="#" aria-label="X" className="text-teal-100 hover:text-white transition">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M18.901 2H22l-6.764 7.73L23 22h-6.094l-4.771-6.224L6.69 22H3.588l7.236-8.268L1 2h6.248l4.313 5.683L18.901 2zm-1.085 18.13h1.717L6.314 3.772H4.472L17.816 20.13z" />
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn" className="text-teal-100 hover:text-white transition"><Linkedin size={18} /></a>
          </div>
        </div>
      </div>

    </footer>
  );
}
