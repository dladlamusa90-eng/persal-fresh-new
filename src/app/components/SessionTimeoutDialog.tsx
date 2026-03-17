"use client";
import React from "react";

interface Props {
  countdown: number; // seconds remaining
  totalSeconds: number; // for the progress bar
  onStay: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutDialog({ countdown, totalSeconds, onStay, onLogout }: Props) {
  const progress = (countdown / totalSeconds) * 100;
  const isUrgent = countdown <= 15;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px]">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-white shadow-[0_20px_45px_-20px_rgba(2,12,27,0.45)] border border-slate-200/80 overflow-hidden">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex items-center justify-center mb-3">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${isUrgent ? "bg-red-500" : "bg-blue-500"}`}
              aria-hidden="true"
            />
          </div>
          <h2 className={`text-xl font-semibold tracking-tight ${isUrgent ? "text-red-700" : "text-slate-900"}`}>
            Session Expiring
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            You have been inactive for a while.
          </p>
        </div>

        <div className="px-6 py-4 text-center">
          <p className="text-sm text-slate-600">
            You will be automatically logged out in:
          </p>
          <div
            className={`mt-3 mb-4 text-5xl font-semibold tabular-nums tracking-tight transition-colors ${
              isUrgent ? "text-red-600" : "text-slate-900"
            }`}
          >
            {countdown}
            <span className="ml-1 text-xl font-normal text-slate-400">s</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-1.5 rounded-full transition-all duration-1000 ease-linear ${
                isUrgent ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-1 flex flex-col gap-3">
          <button
            onClick={onStay}
            className="w-full rounded-lg bg-persal-blue py-2.5 text-sm font-semibold text-white transition hover:bg-persal-dark"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
