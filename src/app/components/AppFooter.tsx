import React from "react";
import { Facebook, Instagram, Linkedin } from "lucide-react";

type AppFooterProps = {
  isAuthenticated?: boolean;
};

export default function AppFooter({ isAuthenticated = false }: AppFooterProps) {
  return (
    <footer className="w-full bg-[#0a275c] text-blue-100 py-10 mt-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <div className="flex flex-col items-center md:items-start">
          <span className="font-bold text-xl mb-2 text-white">Persal</span>
          <span className="text-sm text-blue-100/90">&copy; {new Date().getFullYear()} Persal. All rights reserved.</span>
        </div>

        <nav className="flex flex-col md:flex-row md:flex-wrap gap-3 md:gap-5 text-sm items-center md:items-start md:justify-center">
          <a href="/about" className="hover:underline">About</a>
          <a href="/how-it-works" className="hover:underline">How It Works</a>
          {!isAuthenticated && <a href="/auth/login" className="hover:underline">Login</a>}
          <a href="/auth/login" className="hover:underline">Apply</a>
          <a href="mailto:support@persal.co.za" className="hover:underline">Contact</a>
        </nav>

        <div className="flex flex-col items-center md:items-end">
          <span className="text-white font-semibold mb-2">Join our community</span>
          <form className="w-full md:w-auto flex items-center gap-2 mb-3" action="#" method="post">
            <input
              type="email"
              name="communityEmail"
              required
              placeholder="Enter your email"
              className="w-full md:w-56 rounded-md border border-blue-200/40 bg-white/95 px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-3 py-1.5 transition"
            >
              Join
            </button>
          </form>
          <div className="flex items-center gap-4">
            <a href="#" aria-label="Facebook" className="text-blue-100 hover:text-white transition">
              <Facebook size={18} />
            </a>
            <a href="#" aria-label="Instagram" className="text-blue-100 hover:text-white transition">
              <Instagram size={18} />
            </a>
            <a href="#" aria-label="X" className="text-blue-100 hover:text-white transition">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M18.901 2H22l-6.764 7.73L23 22h-6.094l-4.771-6.224L6.69 22H3.588l7.236-8.268L1 2h6.248l4.313 5.683L18.901 2zm-1.085 18.13h1.717L6.314 3.772H4.472L17.816 20.13z" />
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn" className="text-blue-100 hover:text-white transition">
              <Linkedin size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
