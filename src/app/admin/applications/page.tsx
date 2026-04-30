import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import prisma from "@/lib/prisma";
import AdminApplicationsPanel from "./AdminApplicationsPanel";

export default async function AdminApplicationsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  let usingLegacyFallback = false;
  let users: Array<{
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    idNumber: string | null;
    persalNumber: string | null;
    address: string | null;
    applicationStatus: "PENDING" | "APPROVED" | "REJECTED";
    applicationApprovedAt: Date | null;
    applicationRejectedAt: Date | null;
    applicationRejectionReason: string | null;
    createdAt: Date;
  }>;

  try {
    users = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        idNumber: true,
        persalNumber: true,
        address: true,
        applicationStatus: true,
        applicationApprovedAt: true,
        applicationRejectedAt: true,
        applicationRejectionReason: true,
        createdAt: true,
      },
      orderBy: [
        { applicationStatus: "asc" },
        { createdAt: "desc" },
      ],
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Unknown argument `applicationStatus`")) {
      throw error;
    }

    usingLegacyFallback = true;
    const fallbackUsers = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        idNumber: true,
        persalNumber: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    users = fallbackUsers.map((u) => ({
      ...u,
      applicationStatus: "PENDING",
      applicationApprovedAt: null,
      applicationRejectedAt: null,
      applicationRejectionReason: null,
    }));
  }

  // Sort: PENDING first, then APPROVED, then REJECTED
  const statusOrder = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
  users.sort((a: any, b: any) => {
    const ao = statusOrder[a.applicationStatus as keyof typeof statusOrder] ?? 3;
    const bo = statusOrder[b.applicationStatus as keyof typeof statusOrder] ?? 3;
    if (ao !== bo) return ao - bo;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = users.filter((u: any) => u.applicationStatus === "PENDING").length;

  const usersData = users.map((u: any) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone ?? null,
    idNumber: u.idNumber ?? null,
    persalNumber: u.persalNumber ?? null,
    address: u.address ?? null,
    applicationStatus: u.applicationStatus as "PENDING" | "APPROVED" | "REJECTED",
    applicationApprovedAt: u.applicationApprovedAt?.toISOString() ?? null,
    applicationRejectedAt: u.applicationRejectedAt?.toISOString() ?? null,
    applicationRejectionReason: u.applicationRejectionReason ?? null,
    joinedAt: u.createdAt.toISOString(),
  }));

  return (
    <section className="max-w-full mx-auto py-8 md:py-10 px-4 md:px-6">
      {/* Header */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue">
        <div className="px-6 md:px-8 py-7 md:py-9">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-slate-200/90">Operations Center</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white">
                User Applications
                {pendingCount > 0 && (
                  <span className="ml-3 inline-flex items-center justify-center rounded-full bg-amber-400 text-slate-900 text-base font-bold px-3 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-100/90 max-w-2xl">
                Review new user applications. Verify each applicant&apos;s Persal number and personal details before approving access.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-persal-dark hover:bg-slate-100 transition"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {usingLegacyFallback && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 text-sm font-medium">
          Application status fields are temporarily unavailable in the running Prisma client. Restart the dev server to load the latest Prisma schema.
        </div>
      )}

      <AdminApplicationsPanel initialUsers={usersData} />
    </section>
  );
}
