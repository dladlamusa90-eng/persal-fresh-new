"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardProfile, defaultDashboardProfile } from "@/app/dashboard/profile/profileData";
import FaceIdGate from "@/app/components/FaceIdGate";
import { SOUTH_AFRICAN_BANK_NAMES } from "@/lib/validators/auth";

function displayValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "Not captured yet";
  return String(value);
}
function displayCurrency(value: string | number | null | undefined) {
  if (value == null || value === "") return "Not captured yet";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return `R ${amount.toLocaleString()}`;
}
function formatAccountType(value: string | null | undefined) {
  if (!value) return "Not captured yet";
  if (value === "CHEQUE") return "Cheque account";
  if (value === "SAVINGS") return "Savings account";
  if (value === "TRANSMISSION") return "Transmission account";
  return value;
}
type EditingField = "persalNumber" | "phone" | "email" | "address" | "password" | null;

type BankingMode = "view" | "verifying" | "editing";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "CHEQUE", label: "Cheque account" },
  { value: "SAVINGS", label: "Savings account" },
  { value: "TRANSMISSION", label: "Transmission account" },
] as const;

const POINTS_TIERS = [
  { label: "Bronze", min: 0,    max: 99,   benefit: "No discount yet — repay on time to earn points.",   color: "bg-amber-700" },
  { label: "Silver", min: 100,  max: 299,  benefit: "0.5% interest reduction on your next loan.",        color: "bg-gray-400"  },
  { label: "Gold",   min: 300,  max: 699,  benefit: "1% interest reduction on your next loan.",          color: "bg-yellow-400"},
  { label: "Platinum", min: 700, max: 999, benefit: "2% interest reduction on your next loan.",          color: "bg-teal-400"  },
  { label: "Diamond",  min: 1000, max: Infinity, benefit: "3% interest reduction on your next loan.",   color: "bg-persal-blue"},
] as const;

function PointsCard({ points }: { points: number }) {
  const currentTier = POINTS_TIERS.findLast(t => points >= t.min) ?? POINTS_TIERS[0];
  const nextTier = POINTS_TIERS[POINTS_TIERS.indexOf(currentTier) + 1];
  const progressPercent = nextTier
    ? Math.min(100, ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100;

  // How points are earned
  const earningRules = [
    { range: "Repay R1 000+", pts: 300 },
    { range: "Repay R500–R999", pts: 200 },
    { range: "Repay under R500", pts: 100 },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
      {/* Balance row */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-sm text-gray-500 mb-0.5">Your points balance</p>
          <p className="text-4xl font-semibold text-persal-blue">{points.toLocaleString()}</p>
        </div>
        <div className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white ${currentTier.color}`}>
          {currentTier.label}
        </div>
      </div>

      {/* Progress to next tier */}
      {nextTier ? (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{currentTier.label} ({currentTier.min} pts)</span>
            <span>{nextTier.label} ({nextTier.min} pts)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-persal-blue transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {nextTier.min - points} more point{nextTier.min - points !== 1 ? "s" : ""} to reach {nextTier.label}
          </p>
        </div>
      ) : (
        <p className="mb-5 text-sm font-medium text-persal-blue">You have reached the highest tier — Diamond!</p>
      )}

      {/* Current benefit */}
      <div className="mb-5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-persal-blue font-medium">
        Current benefit: {currentTier.benefit}
      </div>

      {/* All tiers */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">All tiers</p>
      <div className="space-y-2">
        {POINTS_TIERS.map(tier => (
          <div
            key={tier.label}
            className={`flex items-start gap-3 rounded-xl px-4 py-2.5 text-sm ${tier.label === currentTier.label ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-100"}`}
          >
            <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${tier.color}`} />
            <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
              <span className={`font-medium ${tier.label === currentTier.label ? "text-persal-blue" : "text-gray-700"}`}>
                {tier.label} — {tier.max === Infinity ? `${tier.min}+` : `${tier.min}–${tier.max}`} pts
              </span>
              <span className={tier.label === currentTier.label ? "text-persal-blue" : "text-gray-500"}>{tier.benefit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* How to earn */}
      <p className="mt-5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">How to earn points</p>
      <div className="grid grid-cols-3 gap-2">
        {earningRules.map(rule => (
          <div key={rule.range} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-center">
            <p className="text-lg font-semibold text-persal-blue">+{rule.pts}</p>
            <p className="text-xs text-gray-600 mt-0.5">{rule.range} on time</p>
          </div>
        ))}
      </div>
    </div>
  );
}



export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<"profile" | "employment" | "banking">(() => {
    // Allow deep-linking into the banking tab via ?section=banking
    return (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("section") === "banking" ? "banking" : "profile"
      : "profile") as "profile" | "employment" | "banking";
  });
  const [profile, setProfile] = useState<DashboardProfile>(defaultDashboardProfile);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralDiscountPct, setReferralDiscountPct] = useState(0);
  const [referralCopied, setReferralCopied] = useState(false);
  const [accountType, setAccountType] = useState("");
  const [branchCode, setBranchCode] = useState("");

  // Stitch verification state
  const [bankVerified, setBankVerified] = useState(false);
  const [stitchStatus, setStitchStatus] = useState<"idle" | "success" | "error">("idle");
  const [stitchErrorMsg, setStitchErrorMsg] = useState("");

  // Inline edit state
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldMessage, setFieldMessage] = useState<{ field: EditingField | "saved"; text: string; ok: boolean } | null>(null);

  // Employment edit state
  const [employmentStatus, setEmploymentStatus] = useState("Employed");
  const [employmentGrossIncome, setEmploymentGrossIncome] = useState("");
  const [employmentNetIncome, setEmploymentNetIncome] = useState("");
  const [incomeFrequency, setIncomeFrequency] = useState("Monthly");
  const [salaryDay, setSalaryDay] = useState("");
  const [occupation, setOccupation] = useState("");
  const [employer, setEmployer] = useState("");
  const [department, setDepartment] = useState("");
  const [editingEmployment, setEditingEmployment] = useState(false);
  const [employmentSaving, setEmploymentSaving] = useState(false);
  const [employmentMessage, setEmploymentMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Banking edit state
  const [bankingMode, setBankingMode] = useState<BankingMode>("view");
  const [editBankName, setEditBankName] = useState("Capitec");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editAccountType, setEditAccountType] = useState<"CHEQUE" | "SAVINGS" | "TRANSMISSION">("SAVINGS");
  const [editBranchCode, setEditBranchCode] = useState("");
  const [bankingSaving, setBankingSaving] = useState(false);
  const [bankingMessage, setBankingMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Handle Stitch OAuth callback query params and section deep-link
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "banking") setActiveSection("banking");

    const verified = searchParams.get("stitch_verified");
    const error = searchParams.get("stitch_error");
    if (verified === "true") {
      setStitchStatus("success");
      setActiveSection("banking");
      // Reload bank details from server
      fetch("/api/users/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((body) => {
          if (body.user?.bankName) setProfile((p) => ({ ...p, bankName: body.user.bankName }));
          if (body.user?.accountNumber) setProfile((p) => ({ ...p, accountNumber: body.user.accountNumber }));
          if (body.user?.accountType) setAccountType(body.user.accountType);
          if (body.user?.branchCode) setBranchCode(body.user.branchCode);
          if (body.user?.bankVerified) setBankVerified(true);
        })
        .catch(() => {});
    } else if (error) {
      setStitchStatus("error");
      setActiveSection("banking");
      const messages: Record<string, string> = {
        session_expired: "Your verification session expired. Please try again.",
        invalid_state: "Security check failed. Please try again.",
        token_exchange_failed: "Could not connect to Stitch. Please try again.",
        access_denied: "You cancelled bank verification.",
      };
      setStitchErrorMsg(messages[error] ?? "Bank verification failed. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as {
          user?: {
            fullName?: string; email?: string; phone?: string | null;
            idNumber?: string | null; persalNumber?: string | null;
            bankName?: string | null; accountNumber?: string | null;
            accountType?: string | null; branchCode?: string | null; address?: string | null;
            points?: number; bankVerified?: boolean;
            employmentStatus?: string | null; employmentGrossIncome?: string | null;
            employmentNetIncome?: string | null; incomeFrequency?: string | null; salaryDay?: string | null;
            occupation?: string | null; employer?: string | null; department?: string | null;
          };
        };
        if (!mounted || !body.user) return;
        const u = body.user as typeof body.user & { referralCode?: string | null; referralDiscountPct?: number };
        setProfile({
          fullName: u.fullName ?? "",
          email: u.email ?? "",
          phone: u.phone ?? "",
          idNumber: u.idNumber ?? "",
          persalNumber: u.persalNumber ?? "",
          bankName: u.bankName ?? "",
          accountNumber: u.accountNumber ?? "",
          profileImage: null,
          address: u.address ?? "",
        });
        setAccountType(u.accountType ?? "");
        setBranchCode(u.branchCode ?? "");
        setBankVerified(u.bankVerified ?? false);
        setPoints(typeof u.points === "number" ? u.points : 0);
        setReferralCode(u.referralCode ?? null);
        setReferralDiscountPct(typeof u.referralDiscountPct === "number" ? u.referralDiscountPct : 0);
        // Employment
        setEmploymentStatus(u.employmentStatus ?? "Employed");
        setEmploymentGrossIncome(u.employmentGrossIncome ?? "");
        setEmploymentNetIncome(u.employmentNetIncome ?? "");
        setIncomeFrequency(u.incomeFrequency ?? "Monthly");
        setSalaryDay(u.salaryDay ?? "");
        setOccupation(u.occupation ?? "");
        setEmployer(u.employer ?? "");
        setDepartment(u.department ?? "");
        // Banking edit defaults
        setEditBankName(u.bankName ?? "Capitec");
        setEditAccountNumber(u.accountNumber ?? "");
        setEditAccountType((u.accountType as "CHEQUE" | "SAVINGS" | "TRANSMISSION") ?? "SAVINGS");
        setEditBranchCode(u.branchCode ?? "");
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProfile();
    return () => { mounted = false; };
  }, []);

  function startEdit(field: EditingField) {
    setFieldMessage(null);
    setEditingField(field);
    if (field === "persalNumber") setEditValue(profile.persalNumber);
    else if (field === "phone") setEditValue(profile.phone);
    else if (field === "email") setEditValue(profile.email);
    else if (field === "address") setEditValue(profile.address ?? "");
    else if (field === "password") { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
  }

  function cancelEdit() {
    setEditingField(null);
    setFieldMessage(null);
  }

  async function saveField(field: EditingField) {
    if (saving) return;
    if (field === "password") {
      if (newPassword !== confirmPassword) {
        setFieldMessage({ field: "password", text: "New passwords do not match.", ok: false });
        return;
      }
      if (newPassword.length < 6) {
        setFieldMessage({ field: "password", text: "Password must be at least 6 characters.", ok: false });
        return;
      }
    }
    setSaving(true);
    setFieldMessage(null);
    try {
      let body: Record<string, string> = {};
      if (field === "persalNumber") body = { persalNumber: editValue.trim() };
      else if (field === "phone") body = { phone: editValue.trim() };
      else if (field === "email") body = { email: editValue.trim() };
      else if (field === "address") body = { address: editValue.trim() };
      else if (field === "password") body = { currentPassword, newPassword };

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setFieldMessage({ field, text: data.error ?? "Update failed.", ok: false });
        return;
      }
      // Update local profile state
      if (field === "persalNumber") setProfile(p => ({ ...p, persalNumber: editValue.trim() }));
      else if (field === "phone") setProfile(p => ({ ...p, phone: editValue.trim() }));
      else if (field === "email") setProfile(p => ({ ...p, email: editValue.trim().toLowerCase() }));
      else if (field === "address") setProfile(p => ({ ...p, address: editValue.trim() }));
      setFieldMessage({ field, text: "Saved successfully.", ok: true });
      setEditingField(null);
    } catch {
      setFieldMessage({ field, text: "Update failed. Please try again.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function saveEmployment() {
    if (employmentSaving) return;
    setEmploymentSaving(true);
    setEmploymentMessage(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employmentStatus, employmentGrossIncome, employmentNetIncome,
          incomeFrequency, salaryDay, occupation, employer, department,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setEmploymentMessage({ text: data.error ?? "Update failed.", ok: false }); return; }
      setEmploymentMessage({ text: "Employment details saved.", ok: true });
      setEditingEmployment(false);
    } catch {
      setEmploymentMessage({ text: "Update failed. Please try again.", ok: false });
    } finally {
      setEmploymentSaving(false);
    }
  }

  async function saveBanking() {
    if (bankingSaving) return;
    setBankingSaving(true);
    setBankingMessage(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName: editBankName, accountNumber: editAccountNumber, accountType: editAccountType, branchCode: editBranchCode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setBankingMessage({ text: data.error ?? "Update failed.", ok: false }); return; }
      setProfile(p => ({ ...p, bankName: editBankName, accountNumber: editAccountNumber }));
      setAccountType(editAccountType);
      setBranchCode(editBranchCode);
      setBankingMessage({ text: "Banking details saved.", ok: true });
      setBankingMode("view");
    } catch {
      setBankingMessage({ text: "Update failed. Please try again.", ok: false });
    } finally {
      setBankingSaving(false);
    }
  }

  const firstName = (profile.fullName || "").split(" ")[0] || "there";
  if (loading) return <div className="text-center py-8 text-gray-600">Loading profile...</div>;

  function ReadOnlyRow({ label, value }: { label: string; value: string }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
        <div className="text-gray-700">{label}</div>
        <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{value || "—"}</div>
      </div>
    );
  }

  function EditableRow({
    field, label, value, inputType = "text", placeholder = "",
  }: { field: EditingField; label: string; value: string; inputType?: string; placeholder?: string }) {
    const isActive = editingField === field;
    const msg = fieldMessage?.field === field ? fieldMessage : null;
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start">
          <div className="text-gray-700 pt-3">{label}</div>
          {isActive ? (
            <div className="flex flex-col gap-2">
              <input
                type={inputType}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder={placeholder}
                className="rounded-xl border border-persal-blue bg-white px-5 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-persal-blue"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveField(field)}
                  disabled={saving}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 text-sm transition disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 bg-white text-gray-600 font-semibold px-5 py-2 text-sm transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
              {msg && <p className={`text-sm font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{value || "—"}</div>
          )}
        </div>
        {!isActive && (
          <div className="md:pl-[236px]">
            <button type="button" onClick={() => startEdit(field)} className="text-persal-blue hover:underline text-sm">
              Change your {label.toLowerCase()}
            </button>
            {fieldMessage?.field === field && (
              <p className={`text-sm font-medium ${fieldMessage.ok ? "text-green-700" : "text-red-600"}`}>{fieldMessage.text}</p>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <section className="max-w-6xl mx-auto py-6 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-8">
        <aside className="pt-3">
          <nav className="space-y-4 text-base">
            {(["profile", "employment", "banking"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSection(s)}
                className={`block pb-1 w-fit transition ${activeSection === s ? "text-persal-blue font-medium border-b-2 border-persal-blue" : "text-gray-600 hover:text-persal-blue"}`}
              >
                {s === "profile" ? "My profile" : s === "employment" ? "Employment details" : "My banking details"}
              </button>
            ))}
          </nav>
        </aside>

        <div>
          <h1 className="text-4xl md:text-[42px] text-gray-800 font-normal mb-8">Hi {firstName}</h1>

          {activeSection === "profile" && (
            <div className="space-y-7">
              <PointsCard points={points} />

              {/* Referral Code Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Referral Code</p>
                <p className="text-sm text-gray-600 mb-4">
                  Share this code with friends. When they use it on their first loan application, you earn a <strong>5% discount</strong> on your next loan.
                </p>
                {referralCode ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="rounded-xl border-2 border-persal-blue bg-blue-50 px-6 py-3 text-2xl font-bold tracking-widest text-persal-blue select-all">
                      {referralCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(referralCode).then(() => {
                          setReferralCopied(true);
                          setTimeout(() => setReferralCopied(false), 2500);
                        });
                      }}
                      className="rounded-xl border border-persal-blue text-persal-blue font-semibold px-5 py-3 text-sm hover:bg-blue-50 transition"
                    >
                      {referralCopied ? "Copied!" : "Copy code"}
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Your referral code is being generated...</p>
                )}
                {referralDiscountPct > 0 && (
                  <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
                    You have a <strong>{referralDiscountPct}% discount</strong> waiting on your next loan — earned from referrals!
                  </div>
                )}
              </div>

              <ReadOnlyRow label="Full name" value={profile.fullName} />
              <ReadOnlyRow label="ID Number" value={profile.idNumber} />

              <EditableRow field="persalNumber" label="Persal Number" value={profile.persalNumber} inputType="text" placeholder="8-digit Persal Number" />
              <EditableRow field="phone" label="Cell phone number" value={profile.phone} inputType="tel" placeholder="e.g. 0821234567" />
              <EditableRow field="email" label="Email" value={profile.email} inputType="email" placeholder="Email address" />
              <EditableRow field="address" label="Current Address" value={profile.address ?? ""} inputType="text" placeholder="e.g. 12 Maple Street, Johannesburg" />

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start">
                <div className="text-gray-700 pt-3">Password</div>
                {editingField === "password" ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="rounded-xl border border-persal-blue bg-white px-5 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-persal-blue"
                      autoFocus
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 characters)"
                      className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-persal-blue"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-persal-blue"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveField("password")}
                        disabled={saving}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 text-sm transition disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="rounded-xl border border-gray-300 bg-white text-gray-600 font-semibold px-5 py-2 text-sm transition hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                    {fieldMessage?.field === "password" && (
                      <p className={`text-sm font-medium ${fieldMessage.ok ? "text-green-700" : "text-red-600"}`}>{fieldMessage.text}</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">••••••••••••</div>
                )}
              </div>
              {editingField !== "password" && (
                <div className="md:pl-[236px]">
                  <button type="button" onClick={() => startEdit("password")} className="text-persal-blue hover:underline text-sm">
                    Change your password
                  </button>
                  {fieldMessage?.field === "password" && (
                    <p className={`text-sm font-medium ${fieldMessage.ok ? "text-green-700" : "text-red-600"}`}>{fieldMessage.text}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === "employment" && (
            <div className="space-y-6">

              {/* View mode */}
              {!editingEmployment ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800">Employment Details</h3>
                    <button
                      type="button"
                      onClick={() => { setEditingEmployment(true); setEmploymentMessage(null); }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      {employmentStatus && occupation ? "Edit" : "Add details"}
                    </button>
                  </div>
                  {occupation || employmentStatus !== "Employed" || employmentGrossIncome ? (
                    <div className="divide-y divide-slate-100">
                      {[
                        { label: "Employment status", value: displayValue(employmentStatus) },
                        { label: "Occupation / Job title", value: displayValue(occupation) },
                        { label: "Employer / Workplace", value: displayValue(employer) },
                        { label: "Department", value: displayValue(department) },
                        { label: "Income frequency", value: displayValue(incomeFrequency) },
                        { label: "Salary day", value: salaryDay ? `Day ${salaryDay} of the month` : "Not captured yet" },
                        { label: "Gross monthly income", value: displayCurrency(employmentGrossIncome) },
                        { label: "Net monthly income", value: displayCurrency(employmentNetIncome) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between px-5 py-3 text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span className={`font-medium ${value === "Not captured yet" ? "text-slate-400 italic" : "text-slate-800"}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-slate-500">No employment details saved yet.</p>
                      <button
                        type="button"
                        onClick={() => { setEditingEmployment(true); setEmploymentMessage(null); }}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-persal-blue px-4 py-2 text-sm font-semibold text-white hover:bg-persal-dark transition"
                      >
                        Add employment details
                      </button>
                    </div>
                  )}
                  {employmentMessage && (
                    <div className={`mx-5 mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ${employmentMessage.ok ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      {employmentMessage.text}
                    </div>
                  )}
                </div>
              ) : (
                /* Edit form */
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 md:p-6 space-y-5">
                  <h2 className="text-base font-semibold text-slate-800">{occupation ? "Edit" : "Add"} Employment Details</h2>

                  {/* Employment Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Employment Status <span className="text-red-500">*</span></label>
                    <select value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue">
                      {["Employed", "Self-employed", "Retired/Pensioner", "Grant recipient", "Unemployed"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Occupation / Job Title <span className="text-red-500">*</span></label>
                    <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)}
                      placeholder="e.g. Teacher, Nurse, Accountant"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                  </div>

                  {/* Employer */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Employer / Workplace <span className="text-red-500">*</span></label>
                    <input type="text" value={employer} onChange={e => setEmployer(e.target.value)}
                      placeholder="e.g. Department of Education, Clicks, City of Cape Town"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                  </div>

                  {/* Department (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Department <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
                    </label>
                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                      placeholder="e.g. Finance, Human Resources, Nursing"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                  </div>

                  {/* Income Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">How often are you paid? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {["Monthly", "Fortnightly", "Weekly"].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setIncomeFrequency(opt)}
                          className={`rounded-xl border py-3 text-sm font-semibold transition ${incomeFrequency === opt ? "border-persal-blue bg-persal-blue text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Salary Day */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Salary Day <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-3">
                      <input type="text" inputMode="numeric" value={salaryDay}
                        onChange={e => setSalaryDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                        placeholder="e.g. 25"
                        className="w-28 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                      <span className="text-sm text-slate-500">day of the month</span>
                    </div>
                  </div>

                  {/* Gross income */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Gross {incomeFrequency === "Fortnightly" ? "Fortnightly" : incomeFrequency === "Weekly" ? "Weekly" : "Monthly"} Income <span className="text-xs font-normal text-slate-400">(before tax &amp; deductions)</span> <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">R</span>
                      <input type="text" inputMode="numeric" value={employmentGrossIncome}
                        onChange={e => setEmploymentGrossIncome(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                    </div>
                  </div>

                  {/* Net income */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Net {incomeFrequency === "Fortnightly" ? "Fortnightly" : incomeFrequency === "Weekly" ? "Weekly" : "Monthly"} Income <span className="text-xs font-normal text-slate-400">(after tax &amp; deductions)</span> <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">R</span>
                      <input type="text" inputMode="numeric" value={employmentNetIncome}
                        onChange={e => setEmploymentNetIncome(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                    </div>
                    {employmentGrossIncome && employmentNetIncome && Number(employmentNetIncome) > Number(employmentGrossIncome) && (
                      <p className="mt-1.5 text-xs text-amber-600">Net income should not exceed gross income.</p>
                    )}
                  </div>

                  {employmentMessage && (
                    <p className={`text-sm font-medium ${employmentMessage.ok ? "text-teal-700" : "text-red-600"}`}>{employmentMessage.text}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={saveEmployment} disabled={employmentSaving}
                      className="rounded-xl bg-persal-blue hover:bg-persal-dark text-white font-semibold px-6 py-2.5 text-sm transition disabled:opacity-60">
                      {employmentSaving ? "Saving..." : "Save details"}
                    </button>
                    <button type="button" onClick={() => { setEditingEmployment(false); setEmploymentMessage(null); }} disabled={employmentSaving}
                      className="rounded-xl border border-slate-300 bg-white text-slate-600 font-semibold px-6 py-2.5 text-sm transition hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "banking" && (
            <div className="space-y-6">

              {/* Verification status banner */}
              {bankVerified ? (
                <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-5 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
                    <svg className="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-teal-800">Bank account verified</p>
                    <p className="text-xs text-teal-700 mt-0.5">Your bank account has been confirmed via Stitch. You can apply for loans.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Bank account not yet verified</p>
                    <p className="text-xs text-amber-800 mt-0.5">Save your banking details below, then verify with Stitch to apply for a loan.</p>
                  </div>
                </div>
              )}

              {/* Banking details form (view / edit) */}
              {bankingMode === "view" ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800">Banking Details</h3>
                    <button
                      type="button"
                      onClick={() => { setBankingMode("editing"); setBankingMessage(null); }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      {profile.bankName ? "Edit" : "Add details"}
                    </button>
                  </div>
                  {profile.bankName ? (
                    <div className="divide-y divide-slate-100">
                      {[
                        { label: "Bank name", value: displayValue(profile.bankName) },
                        { label: "Account number", value: displayValue(profile.accountNumber) },
                        { label: "Account type", value: formatAccountType(accountType) },
                        { label: "Branch code", value: displayValue(branchCode) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between px-5 py-3 text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-medium text-slate-800">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-slate-500">No banking details saved yet.</p>
                      <button
                        type="button"
                        onClick={() => { setBankingMode("editing"); setBankingMessage(null); }}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-persal-blue px-4 py-2 text-sm font-semibold text-white hover:bg-persal-dark transition"
                      >
                        Add banking details
                      </button>
                    </div>
                  )}
                  {bankingMessage && (
                    <div className={`mx-5 mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ${bankingMessage.ok ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      {bankingMessage.text}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                  <h2 className="text-base font-semibold text-slate-800">{profile.bankName ? "Edit" : "Add"} Banking Details</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Name</label>
                      <select value={editBankName} onChange={e => setEditBankName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue">
                        {SOUTH_AFRICAN_BANK_NAMES.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Number</label>
                      <input type="text" inputMode="numeric" value={editAccountNumber}
                        onChange={e => setEditAccountNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g. 1234567890"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Type</label>
                      <select value={editAccountType} onChange={e => setEditAccountType(e.target.value as "CHEQUE" | "SAVINGS" | "TRANSMISSION")}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue">
                        {ACCOUNT_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Branch Code</label>
                      <input type="text" inputMode="numeric" value={editBranchCode}
                        onChange={e => setEditBranchCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit code"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-persal-blue" />
                    </div>
                  </div>

                  {bankingMessage && (
                    <p className={`text-sm font-medium ${bankingMessage.ok ? "text-teal-700" : "text-red-600"}`}>{bankingMessage.text}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={saveBanking} disabled={bankingSaving}
                      className="rounded-xl bg-persal-blue hover:bg-persal-dark text-white font-semibold px-6 py-2.5 text-sm transition disabled:opacity-60">
                      {bankingSaving ? "Saving..." : "Save details"}
                    </button>
                    <button type="button" onClick={() => { setBankingMode("view"); setBankingMessage(null); }} disabled={bankingSaving}
                      className="rounded-xl border border-slate-300 bg-white text-slate-600 font-semibold px-6 py-2.5 text-sm transition hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Stitch verification card — always visible */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-persal-dark to-persal-blue">
                  <p className="text-xs uppercase tracking-widest text-slate-300 font-medium">Step 2 — Recommended</p>
                  <h2 className="mt-0.5 text-base font-bold text-white">Verify with Stitch</h2>
                  <p className="text-xs text-slate-300 mt-1">Instant, secure bank account verification — no manual entry needed.</p>
                </div>
                <div className="px-5 py-5 space-y-4">
                  <ul className="space-y-2.5 text-sm text-slate-700">
                    {[
                      "Instant — takes less than a minute",
                      "Secure — uses your bank's own login",
                      "Auto-fills your account details",
                      "Required before you can apply for a loan",
                    ].map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <svg className="h-4 w-4 shrink-0 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        {point}
                      </li>
                    ))}
                  </ul>

                  {stitchStatus === "error" && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{stitchErrorMsg}</p>
                  )}

                  <a
                    href={`/api/stitch/link?returnTo=${encodeURIComponent("/dashboard/profile?section=banking")}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-persal-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-persal-dark"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    {bankVerified ? "Re-verify with Stitch" : "Verify with Stitch"}
                  </a>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  );
}
