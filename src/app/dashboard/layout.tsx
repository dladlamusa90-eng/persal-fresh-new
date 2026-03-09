"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ChatWidget from "@/app/components/ChatWidget";
import LoanStatusBadge from "@/app/components/LoanStatusBadge";

function getProfileInitial(fullName: string) {
  const initial = fullName.trim().charAt(0);
  return initial ? initial.toUpperCase() : "P";
}

const DropdownMenu = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <li className="relative group flex items-center h-[56px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 h-[56px] flex items-center justify-center rounded text-sm font-medium text-persal-dark hover:bg-blue-50 hover:text-persal-blue transition gap-1"
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
      <Link href={href} className="block px-4 py-2 text-sm text-persal-dark hover:bg-blue-50 hover:text-persal-blue transition">
        {children}
      </Link>
    </li>
  );
};

const dashboardMenu = [
  { name: "Apply", href: "/dashboard/lending/apply" },
  { name: "Loan Management", subMenu: [
    { name: "Active Loan", href: "/dashboard/lending/active-loan" },
    { name: "Status", href: "/dashboard/lending/application-status" },
    { name: "Schedule", href: "/dashboard/lending/schedule" },
    { name: "Statement", href: "/dashboard/lending/statement" },
    { name: "Loan History", href: "/dashboard/lending/history" },
  ] },
  { name: "Profile", href: "/dashboard/profile" },
  { name: "Contact Us", href: "/dashboard/support" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = true;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState("Thabo Mokoena");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const pathname = usePathname();

  const isActivePath = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  React.useEffect(() => {
    const canvas = document.getElementById('bg-balls-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const balls = Array.from({ length: 18 }).map(() => ({
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
      requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) return;

        const body = (await response.json()) as {
          user?: { fullName?: string; profileImage?: string | null };
        };

        if (!mounted) return;

        setProfileName(body.user?.fullName ?? "Persal User");
        setProfileImage(body.user?.profileImage ?? null);
      } catch {
        return;
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col relative overflow-x-hidden">
      <canvas id="bg-balls-canvas" className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh'}} />
      <div className="relative z-10">
        {loggedIn && (
          <>
            <nav className="md:hidden w-full border-b border-gray-200 bg-white px-4 h-14 flex items-center justify-between">
              <button
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
                className="h-10 w-10 flex items-center justify-center rounded text-persal-dark hover:bg-blue-50 transition"
              >
                <span className="text-xl leading-none">☰</span>
              </button>
              <h1 className="text-base font-semibold text-persal-dark">Dashboard</h1>
              <Link
                href="/dashboard/profile"
                aria-label="Profile"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 text-sm font-semibold text-persal-dark overflow-hidden bg-gray-100"
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  getProfileInitial(profileName)
                )}
              </Link>
            </nav>

            <div
              className={`md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside
              className={`md:hidden fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white z-50 border-r border-gray-200 shadow-xl transform transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
              <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-persal-dark">Menu</span>
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
              <nav className="p-4 flex flex-col gap-2">
                {dashboardMenu.map(item => (
                  item.subMenu ? (
                    <div key={item.name} className="flex flex-col gap-1">
                      {item.subMenu.map(sub => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-3 py-2 rounded text-sm font-medium transition w-full ${
                            isActivePath(sub.href)
                              ? "bg-blue-100 text-persal-blue"
                              : "text-persal-dark hover:bg-blue-50 hover:text-persal-blue"
                          }`}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded text-sm font-medium transition w-full ${
                        isActivePath(item.href)
                          ? "bg-blue-100 text-persal-blue"
                          : "text-persal-dark hover:bg-blue-50 hover:text-persal-blue"
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                ))}
                <a
                  href="/"
                  className="mt-3 px-4 py-2 bg-persal-blue text-white rounded-lg font-semibold text-sm shadow hover:bg-persal-dark transition text-center w-full"
                >
                  Logout
                </a>
              </nav>
            </aside>

            <nav className="hidden md:flex w-full border-b border-gray-200 bg-white px-8 items-center justify-between">
              <div className="flex items-center gap-6 h-[48px]">
                <img src="/logo.png" alt="Persal Logo" className="h-[42px] w-auto object-contain" style={{ height: '42px' }} />
              </div>
              <div className="flex items-center gap-4">
                <ul className="flex gap-4 items-center h-[56px]">
                  {dashboardMenu.map(item => (
                    item.subMenu ? (
                      <DropdownMenu key={item.name} label={item.name}>
                        {item.subMenu.map(sub => (
                          <DropdownMenuItem key={sub.href} href={sub.href}>
                            {sub.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenu>
                    ) : (
                      <li key={item.href} className="flex items-center h-[56px]">
                        <Link href={item.href} className="px-4 h-[56px] flex items-center rounded text-sm font-medium text-persal-dark hover:bg-blue-50 hover:text-persal-blue transition" style={{lineHeight: '1.2'}}>
                          {item.name}
                        </Link>
                      </li>
                    )
                  ))}
                </ul>
                <a
                  href="/"
                  className="ml-4 px-4 py-2 bg-persal-blue text-white rounded-lg font-semibold text-sm shadow hover:bg-persal-dark transition"
                  title="Logout and return to homepage"
                >
                  Logout
                </a>
              </div>
            </nav>
          </>
        )}
        <LoanStatusBadge />
        <main className="flex-1 w-full px-4 md:px-8 py-4 md:py-8">
          <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow p-4 md:p-8 mt-2 md:mt-8 mb-8 md:mb-12">
            {children}
          </div>
        </main>
        <ChatWidget />
      </div>
    </div>
  );
}
