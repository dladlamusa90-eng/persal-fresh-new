"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

type LatestLoan = {
  id: string;
  status: LoanStatus;
};

export default function LoanStatusBadge() {
  const [latestLoan, setLatestLoan] = useState<LatestLoan | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLoanStatus() {
      try {
        const response = await fetch("/api/loans/me", { cache: "no-store" });
        if (!response.ok) return;

        const body = (await response.json()) as { latestLoan?: LatestLoan | null };
        if (mounted) {
          setLatestLoan(body.latestLoan ?? null);
        }
      } catch {
        if (mounted) {
          setLatestLoan(null);
        }
      }
    }

    loadLoanStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const badgeView = useMemo(() => {
    const status = latestLoan?.status;

    if (!status || status === "REJECTED" || status === "PAID") {
      return {
        label: "No Active Loan",
        className: "bg-gray-800 text-white",
        dotClassName: "bg-gray-500",
        href: "/dashboard/lending/active-loan",
      };
    }

    if (status === "PENDING") {
      return {
        label: "Pending Loan",
        className: "bg-amber-100 text-amber-800",
        dotClassName: "bg-amber-500",
        href: "/dashboard/lending/application-status",
      };
    }

    return {
      label: "Approved Loan",
      className: "bg-green-100 text-green-800",
      dotClassName: "bg-green-600",
      href: "/dashboard/lending/application-status",
    };
  }, [latestLoan]);

  const badgeClassName = `flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold text-xs md:text-sm ${badgeView.className}`;

  return (
    <div className="px-4 md:px-8 py-4">
      <div className="flex items-center gap-2 md:gap-3">
        <Link
          href={badgeView.href}
          className={`${badgeClassName} cursor-pointer hover:opacity-90 transition`}
          title="View loan status"
        >
          <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${badgeView.dotClassName}`} />
          {badgeView.label}
        </Link>
      </div>
    </div>
  );
}
