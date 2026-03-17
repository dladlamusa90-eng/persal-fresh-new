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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 text-center transition-colors ${isUrgent ? "bg-red-50" : "bg-amber-50"}`}>
          <div className={`text-4xl mb-2`}>{isUrgent ? "⛔" : "⏰"}</div>
          <h2 className={`text-lg font-bold ${isUrgent ? "text-red-700" : "text-amber-700"}`}>
            Session Expiring
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            You have been inactive for a while.
          </p>
        </div>

        {/* Countdown */}
        <div className="px-6 py-5 text-center">
          <p className="text-gray-700 text-sm">
            You will be automatically logged out in:
          </p>
          <div
            className={`text-5xl font-bold mt-3 mb-4 tabular-nums transition-colors ${
              isUrgent ? "text-red-600" : "text-amber-500"
            }`}
          >
            {countdown}
            <span className="text-xl font-normal text-gray-400 ml-1">s</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ease-linear ${
                isUrgent ? "bg-red-500" : "bg-amber-400"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button
            onClick={onStay}
            className="w-full py-2.5 bg-persal-blue text-white rounded-lg font-semibold text-sm shadow hover:bg-persal-dark transition"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition"
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
