"use client";

import React, { Suspense } from "react";
import UnifiedLoanApplicationForm from "@/app/components/UnifiedLoanApplicationForm";

export default function ApplyPage() {
  return (
    <Suspense fallback={<section className="max-w-2xl mx-auto py-12" />}>
      <UnifiedLoanApplicationForm user={{ isLoggedIn: true }} />
    </Suspense>
  );
}
