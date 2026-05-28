"use client";
import React, { Suspense } from "react";
import UnifiedLoanApplicationForm from "../components/UnifiedLoanApplicationForm";

export default function GuestApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <UnifiedLoanApplicationForm user={{ isLoggedIn: false }} />
    </Suspense>
  );
}
