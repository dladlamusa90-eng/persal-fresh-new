"use client";
import { useEffect, useState } from "react";
import { DashboardProfile, defaultDashboardProfile } from "@/app/dashboard/profile/profileData";

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
function stringValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "";
  return String(value);
}

type EditingField = "persalNumber" | "phone" | "email" | "address" | "password" | null;

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
  const [activeSection, setActiveSection] = useState<"profile" | "employment" | "banking">("profile");
  const [profile, setProfile] = useState<DashboardProfile>(defaultDashboardProfile);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [accountType, setAccountType] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [applicationData, setApplicationData] = useState<Record<string, string | number | null>>({});

  // Inline edit state
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldMessage, setFieldMessage] = useState<{ field: EditingField | "saved"; text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const [response, draftResponse] = await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/loan-application-draft", { cache: "no-store" }),
        ]);
        if (!response.ok) return;
        const body = (await response.json()) as {
          user?: {
            fullName?: string; email?: string; phone?: string | null;
            idNumber?: string | null; persalNumber?: string | null;
            bankName?: string | null; accountNumber?: string | null;
            accountType?: string | null; branchCode?: string | null; address?: string | null;
            points?: number;
          };
        };
        const draftBody = draftResponse.ok
          ? ((await draftResponse.json()) as { draft?: { data?: Record<string, string | number | null> } })
          : undefined;
        if (!mounted || !body.user) return;
        setProfile({
          fullName: body.user.fullName ?? "",
          email: body.user.email ?? "",
          phone: body.user.phone ?? "",
          idNumber: body.user.idNumber ?? "",
          persalNumber: body.user.persalNumber ?? "",
          bankName: body.user.bankName ?? "",
          accountNumber: body.user.accountNumber ?? "",
          profileImage: null,
          address: body.user.address ?? "",
        });
        setAccountType(body.user.accountType ?? "");
        setBranchCode(body.user.branchCode ?? "");
        setPoints(typeof body.user.points === "number" ? body.user.points : 0);
        setApplicationData(draftBody?.draft?.data ?? {});
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
            <div className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Employment status</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{displayValue(applicationData.employmentStatus)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Gross monthly income (before tax &amp; deductions)</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{displayCurrency(applicationData.employmentGrossIncome)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Net monthly income (after tax &amp; deductions)</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{displayCurrency(applicationData.employmentNetIncome)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Frequency of income</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{displayValue(applicationData.incomeFrequency)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Salary day</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{displayValue(applicationData.salaryDay)}</div>
              </div>
              <div className="md:pl-[236px]"><a href="/dashboard/lending/employment-details" className="text-persal-blue hover:underline">Change your employment details</a></div>
            </div>
          )}

          {activeSection === "banking" && (
            <div className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Bank name</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{profile.bankName || displayValue(applicationData.bankName)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Account number</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{profile.accountNumber || displayValue(applicationData.accountNumber)}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Account type</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{formatAccountType(accountType || stringValue(applicationData.accountType))}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Branch code</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{branchCode || displayValue(applicationData.branchCode)}</div>
              </div>
              <div className="md:pl-[236px]"><a href="/dashboard/lending/bank-details" className="text-persal-blue hover:underline">Change your banking details</a></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
