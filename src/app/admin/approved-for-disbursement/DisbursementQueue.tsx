"use client";

import { useState } from "react";
import Link from "next/link";

type DisburseLoan = {
  id: string;
  amount: number;
  termDays: number;
  applicantFullName: string | null;
  applicantEmail: string | null;
  applicantPersalNumber: string | null;
  applicantBankName: string | null;
  applicantAccountNumber: string | null;
  applicantBranchCode: string | null;
  createdAt: string;
};

type CardState = "idle" | "confirming" | "loading" | "done" | "error";

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(n: number) {
  return `R ${new Intl.NumberFormat("en-ZA").format(Math.round(n))}`;
}

export default function DisbursementQueue({ initialLoans }: { initialLoans: DisburseLoan[] }) {
  const [loans, setLoans] = useState<DisburseLoan[]>(initialLoans);
  const [cardState, setCardState] = useState<Record<string, CardState>>({});
  const [references, setReferences] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialLoans.map((l) => [l.id, `TRF-${Date.now()}-${l.id.slice(0, 6)}`])
    )
  );
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});

  const totalAmount = loans.reduce((s, l) => s + l.amount, 0);
  const pendingLoans = loans.filter((l) => cardState[l.id] !== "done");
  const doneCount = loans.length - pendingLoans.length;

  function getState(id: string): CardState {
    return cardState[id] ?? "idle";
  }

  function startConfirm(id: string) {
    setCardState((s) => ({ ...s, [id]: "confirming" }));
    setErrorMsg((e) => ({ ...e, [id]: "" }));
  }

  function cancelConfirm(id: string) {
    setCardState((s) => ({ ...s, [id]: "idle" }));
  }

  async function disburse(loan: DisburseLoan) {
    setCardState((s) => ({ ...s, [loan.id]: "loading" }));
    setErrorMsg((e) => ({ ...e, [loan.id]: "" }));
    try {
      const res = await fetch(`/api/admin/loans/${loan.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: loan.amount,
          reference: references[loan.id] || `TRF-${Date.now()}-${loan.id.slice(0, 6)}`,
          mode: "MANUAL_TRANSFER",
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCardState((s) => ({ ...s, [loan.id]: "error" }));
        setErrorMsg((e) => ({ ...e, [loan.id]: body.error ?? "Disbursement failed." }));
        return;
      }
      setCardState((s) => ({ ...s, [loan.id]: "done" }));
    } catch {
      setCardState((s) => ({ ...s, [loan.id]: "error" }));
      setErrorMsg((e) => ({ ...e, [loan.id]: "Network error. Please try again." }));
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-6">

      {/* Page header */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="px-5 md:px-7 py-5 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-200/80">Admin · Disbursement Queue</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Disburse Approved Loans</h1>
            <p className="mt-1 text-sm text-slate-200/80">
              {loans.length} loan{loans.length !== 1 ? "s" : ""} ready — total{" "}
              <span className="font-semibold text-white">{fmtAmount(totalAmount)}</span>
              {doneCount > 0 && (
                <span className="ml-2 text-green-300 font-semibold">
                  · {doneCount} disbursed this session
                </span>
              )}
            </p>
          </div>
          <Link
            href="/admin"
            className="self-start md:self-auto inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="m12 5-7 7 7 7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Progress strip */}
        {loans.length > 0 && (
          <div className="h-1.5 bg-slate-200">
            <div
              className="h-full bg-green-500 transition-all duration-700"
              style={{ width: `${Math.round((doneCount / loans.length) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {loans.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <svg className="h-7 w-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">All caught up!</h2>
          <p className="mt-1 text-sm text-slate-500">No approved loans are currently waiting for disbursement.</p>
          <Link href="/admin" className="mt-4 inline-flex items-center rounded-xl bg-persal-blue px-4 py-2 text-sm font-semibold text-white hover:bg-persal-dark">
            Return to Dashboard
          </Link>
        </div>
      )}

      {/* Loan cards */}
      {loans.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loans.map((loan) => {
            const state = getState(loan.id);
            const isDone = state === "done";
            const isLoading = state === "loading";

            return (
              <div
                key={loan.id}
                className={`rounded-2xl border shadow-sm transition-all duration-500 ${
                  isDone
                    ? "border-green-200 bg-green-50/60 opacity-75"
                    : "border-slate-200 bg-white hover:shadow-md"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 p-4 border-b border-slate-100">
                  {/* Avatar */}
                  <div
                    className={`shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      isDone ? "bg-green-500" : "bg-persal-dark"
                    }`}
                  >
                    {isDone ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      initials(loan.applicantFullName)
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {loan.applicantFullName ?? "Unknown Applicant"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{loan.applicantEmail ?? "—"}</p>
                    {loan.applicantPersalNumber && (
                      <p className="text-xs text-slate-500">Persal: {loan.applicantPersalNumber}</p>
                    )}
                  </div>

                  {/* Amount badge */}
                  <div className="shrink-0 text-right">
                    <p className={`text-xl font-bold ${isDone ? "text-green-700" : "text-persal-blue"}`}>
                      {fmtAmount(loan.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400">{loan.termDays}-day term</p>
                  </div>
                </div>

                {/* Bank details */}
                <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-b border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Bank</p>
                    <p className="font-medium text-slate-800 truncate">{loan.applicantBankName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Account Number</p>
                    <p className="font-medium text-slate-800 font-mono">{loan.applicantAccountNumber ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Branch Code</p>
                    <p className="font-medium text-slate-800">{loan.applicantBranchCode ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Applied</p>
                    <p className="font-medium text-slate-800">{fmtDate(loan.createdAt)}</p>
                  </div>
                </div>

                {/* Action area */}
                <div className="px-4 py-3">
                  {isDone ? (
                    <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Disbursed — reference: <span className="font-mono">{references[loan.id]}</span>
                    </div>
                  ) : state === "confirming" ? (
                    <div className="space-y-2">
                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">Disbursement reference</span>
                        <input
                          type="text"
                          value={references[loan.id] ?? ""}
                          onChange={(e) => setReferences((r) => ({ ...r, [loan.id]: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-persal-blue"
                        />
                      </label>
                      {errorMsg[loan.id] && (
                        <p className="text-xs text-red-600">{errorMsg[loan.id]}</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => disburse(loan)}
                          disabled={isLoading}
                          className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition"
                        >
                          Confirm & Disburse
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelConfirm(loan.id)}
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      {errorMsg[loan.id] && state === "error" ? (
                        <p className="text-xs text-red-600 flex-1">{errorMsg[loan.id]}</p>
                      ) : (
                        <Link
                          href={`/admin/loans/${loan.id}`}
                          className="text-xs text-slate-500 hover:text-persal-blue underline underline-offset-2"
                        >
                          View full application
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => startConfirm(loan.id)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-persal-blue px-4 py-2 text-sm font-semibold text-white hover:bg-persal-dark disabled:opacity-60 transition"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                        Disburse
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All done banner */}
      {loans.length > 0 && doneCount === loans.length && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
          <p className="text-base font-semibold text-green-800">
            All {loans.length} loan{loans.length !== 1 ? "s" : ""} in this queue have been disbursed.
          </p>
          <Link href="/admin" className="mt-3 inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
            Return to Dashboard
          </Link>
        </div>
      )}
    </section>
  );
}
