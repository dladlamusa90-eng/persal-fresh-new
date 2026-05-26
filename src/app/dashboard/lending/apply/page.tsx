"use client";

import React, { Suspense, useState, useEffect } from "react";
import UnifiedLoanApplicationForm from "@/app/components/UnifiedLoanApplicationForm";

type UserProfile = {
  email: string;
  idNumber: string | null;
  phone: string | null;
  persalNumber: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountType: string | null;
  branchCode: string | null;
};

function ApplyContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.json())
      .then(data => setProfile(data?.user ?? {}))
      .catch(() => setProfile({}));
  }, []);

  if (profile === null) return <section className="max-w-2xl mx-auto py-4" />;

  return (
    <UnifiedLoanApplicationForm
      user={{
        isLoggedIn: true,
        email: profile.email ?? "",
        idNumber: profile.idNumber ?? "",
        phone: profile.phone ?? "",
        persalNumber: profile.persalNumber ?? "",
        bankName: profile.bankName ?? "",
        accountNumber: profile.accountNumber ?? "",
        accountType: profile.accountType ?? "",
        branchCode: profile.branchCode ?? "",
      }}
    />
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<section className="max-w-2xl mx-auto py-4" />}>
      <ApplyContent />
    </Suspense>
  );
}
