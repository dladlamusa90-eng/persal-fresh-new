"use client";
import Link from "next/link";
import { useState } from "react";


export default function PublicNavbar() {
  // Mock authentication state
  const [loggedIn, setLoggedIn] = useState(false);
  // Mock user points
  const userPoints = 320;

  function handleLogout() {
    setLoggedIn(false);
    window.location.href = "/";
  }

  return (
    <header className="w-full h-[70px] border-b border-gray-200 bg-white flex items-center justify-between px-8">
      <div className="flex items-center gap-8">
        <Link
          href={loggedIn ? "/dashboard/lending/overview" : "/"}
          className="font-bold text-2xl tracking-tight text-blue-700"
        >
          PERSAL
        </Link>
        <nav className="hidden md:flex gap-6 text-gray-800 font-medium">
          <Link href="/about" className="hover:text-blue-700 transition">About</Link>
          <Link href="/how-it-works" className="hover:text-blue-700 transition">How It Works</Link>
        </nav>
      </div>
      <div className="flex gap-4 items-center">
        {!loggedIn ? (
          <>
            <Link href="/auth/login" className="px-6 py-2 border border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition">Login</Link>
            <Link href="/auth/signup" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">Sign Up</Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl">
              <span className="text-blue-700 font-bold text-lg">{userPoints}</span>
              <span className="text-blue-700 text-sm font-medium">Points</span>
            </div>
            <Link href="/dashboard/profile" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition">Profile</Link>
            <button onClick={handleLogout} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition">Logout</button>
          </>
        )}
      </div>
    </header>
  );
}
