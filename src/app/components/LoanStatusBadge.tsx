"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LoanStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

type LatestLoan = {
  id: string;
  status: LoanStatus;
};

type PointsEvent = {
  id: string;
  type: "ON_TIME_REPAYMENT" | "ADMIN_ADJUSTMENT";
  pointsDelta: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

export default function LoanStatusBadge() {
  const [latestLoan, setLatestLoan] = useState<LatestLoan | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pointsHistory, setPointsHistory] = useState<PointsEvent[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadLoanStatus() {
      try {
        const [loanResponse, userResponse] = await Promise.all([
          fetch("/api/loans/me", { cache: "no-store" }),
          fetch("/api/users/me", { cache: "no-store" }),
        ]);

        const body = loanResponse.ok
          ? ((await loanResponse.json()) as { latestLoan?: LatestLoan | null })
          : { latestLoan: null };

        const userBody = userResponse.ok
          ? ((await userResponse.json()) as { user?: { points?: number | null } })
          : { user: null };

        if (mounted) {
          setLatestLoan(body.latestLoan ?? null);
          setUserPoints(userBody.user?.points ?? 0);
        }
      } catch {
        if (mounted) {
          setLatestLoan(null);
          setUserPoints(null);
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
        href: "/dashboard/lending/application-status",
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
  const formattedPoints = useMemo(
    () => (typeof userPoints === "number" ? new Intl.NumberFormat("en-ZA").format(userPoints) : "0"),
    [userPoints]
  );

  async function togglePointsHistory() {
    const nextOpen = !showPointsHistory;
    setShowPointsHistory(nextOpen);

    if (!nextOpen || pointsHistory.length > 0) {
      return;
    }

    try {
      setIsLoadingHistory(true);
      const response = await fetch("/api/users/points-history", { cache: "no-store" });
      if (!response.ok) {
        setPointsHistory([]);
        return;
      }

      const body = (await response.json()) as { events?: PointsEvent[] };
      setPointsHistory(Array.isArray(body.events) ? body.events : []);
    } catch {
      setPointsHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function formatEventDate(value: string) {
    return new Date(value).toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="px-4 md:px-8 py-4">
      <div className="flex flex-col items-start gap-2 md:gap-3">
        <Link
          href={badgeView.href}
          className={`${badgeClassName} cursor-pointer hover:opacity-90 transition`}
          title="View loan status"
        >
          <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${badgeView.dotClassName}`} />
          {badgeView.label}
        </Link>

        {(
          <div className="space-y-2">
            <button
              type="button"
              onClick={togglePointsHistory}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-left hover:bg-amber-50/40 transition"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
                  <path d="M17 6h3a2 2 0 0 1-2 2h-1" />
                  <path d="M7 6H4a2 2 0 0 0 2 2h1" />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">Your Points</span>
                <span className="block text-sm font-bold text-slate-900">{formattedPoints}</span>
              </span>
            </button>

            {showPointsHistory && (
              <div className="max-w-sm rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p className="mb-2 font-semibold text-slate-900">Points Activity Timeline</p>

                {isLoadingHistory ? (
                  <p>Loading...</p>
                ) : pointsHistory.length === 0 ? (
                  <p>No recorded points events yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {pointsHistory.map((event) => (
                      <li key={event.id} className="rounded-md border border-slate-100 px-2 py-1.5">
                        <p className="font-medium text-slate-800">
                          {event.pointsDelta > 0 ? "+" : ""}
                          {event.pointsDelta} points
                          <span className="ml-1 text-slate-500">{event.description ?? event.type}</span>
                        </p>
                        <p className="text-slate-500">{formatEventDate(event.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
