"use client";
import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DashboardProfile, defaultDashboardProfile, getProfileInitial } from "@/app/dashboard/profile/profileData";
import {
  SOUTH_AFRICAN_BANK_NAMES,
  getBankAccountConstraintLabel,
  isSouthAfricanBankName,
  isSouthAfricanIdNumber,
  isSouthAfricanPhoneNumber,
  isValidBankAccountNumber,
  isValidPersalNumber,
  normalizeAccountNumber,
  normalizeIdNumber,
  normalizePersalNumber,
  normalizePhoneNumber,
} from "@/lib/validators/auth";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState<"profile" | "employment" | "banking">("profile");
  const [profile, setProfile] = useState<DashboardProfile>(defaultDashboardProfile);
  const [initialProfile, setInitialProfile] = useState<DashboardProfile>(defaultDashboardProfile);
  const [points, setPoints] = useState(0);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1.2);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [receivesCommunication, setReceivesCommunication] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) {
          setErrorMessage("Unable to load profile details.");
          return;
        }

        const body = (await response.json()) as {
          user?: {
            fullName?: string;
            email?: string;
            phone?: string | null;
            idNumber?: string | null;
            persalNumber?: string | null;
            bankName?: string | null;
            accountNumber?: string | null;
            profileImage?: string | null;
            points?: number;
            address?: string | null;
          };
        };

        if (!mounted || !body.user) return;

        setProfile({
          fullName: body.user.fullName ?? "",
          email: body.user.email ?? "",
          phone: body.user.phone ?? "",
          idNumber: body.user.idNumber ?? "",
          persalNumber: body.user.persalNumber ?? "",
          bankName: body.user.bankName ?? "",
          accountNumber: body.user.accountNumber ?? "",
          profileImage: body.user.profileImage ?? null,
          address: body.user.address ?? "",
        });
        setInitialProfile({
          fullName: body.user.fullName ?? "",
          email: body.user.email ?? "",
          phone: body.user.phone ?? "",
          idNumber: body.user.idNumber ?? "",
          persalNumber: body.user.persalNumber ?? "",
          bankName: body.user.bankName ?? "",
          accountNumber: body.user.accountNumber ?? "",
          profileImage: body.user.profileImage ?? null,
          address: body.user.address ?? "",
        });
        setPoints(typeof body.user.points === "number" ? body.user.points : 0);
      } catch {
        setErrorMessage("Unable to load profile details.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const profileInitial = useMemo(() => getProfileInitial(profile.fullName), [profile.fullName]);

  function updateField<K extends keyof DashboardProfile>(field: K, value: DashboardProfile[K]) {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSavedMessage("");
    setErrorMessage("");
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Invalid image file."));
      image.src = src;
    });
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCropSource(reader.result);
          setCropZoom(1.2);
          setCropX(0);
          setCropY(0);
          setCropOpen(true);
          setSavedMessage("");
          setErrorMessage("");
        }
      };
      reader.onerror = () => setErrorMessage("Could not read selected image.");
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage("Could not process image. Please try another one.");
    }

    event.target.value = "";
  }

  async function handleApplyCrop() {
    if (!cropSource) return;

    try {
      const image = await loadImage(cropSource);
      const previewSize = 220;
      const outputSize = 256;

      const drawScale = Math.max(outputSize / image.width, outputSize / image.height) * cropZoom;

      const drawWidth = image.width * drawScale;
      const drawHeight = image.height * drawScale;

      const offsetX = (cropX * outputSize) / previewSize;
      const offsetY = (cropY * outputSize) / previewSize;

      const drawX = (outputSize - drawWidth) / 2 + offsetX;
      const drawY = (outputSize - drawHeight) / 2 + offsetY;

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setErrorMessage("Unable to process image. Please try again.");
        return;
      }

      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      const cropped = canvas.toDataURL("image/jpeg", 0.85);

      updateField("profileImage", cropped);
      setCropOpen(false);
      setCropSource(null);
    } catch {
      setErrorMessage("Could not process image. Please try another one.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isEditing || isSaving) {
      return;
    }

    const normalizedPayload: DashboardProfile = {
      ...profile,
      fullName: profile.fullName.trim(),
      email: profile.email.trim().toLowerCase(),
      phone: normalizePhoneNumber(profile.phone.trim()),
      idNumber: normalizeIdNumber(profile.idNumber.trim()),
      persalNumber: normalizePersalNumber(profile.persalNumber.trim()),
      bankName: profile.bankName.trim(),
      accountNumber: normalizeAccountNumber(profile.accountNumber.trim()),
    };

    if (
      !normalizedPayload.fullName ||
      !normalizedPayload.email ||
      !normalizedPayload.phone ||
      !normalizedPayload.idNumber ||
      !normalizedPayload.persalNumber ||
      !normalizedPayload.bankName ||
      !normalizedPayload.accountNumber
    ) {
      setErrorMessage("All profile fields are required");
      setSavedMessage("");
      return;
    }

    if (!isValidEmail(normalizedPayload.email)) {
      setErrorMessage("Please enter a valid email address.");
      setSavedMessage("");
      return;
    }

    if (!isSouthAfricanPhoneNumber(normalizedPayload.phone)) {
      setErrorMessage("Please enter a valid South African phone number (e.g. 0821234567 or +27821234567).");
      setSavedMessage("");
      return;
    }

    if (!isValidPersalNumber(normalizedPayload.persalNumber)) {
      setErrorMessage("Persal Number must be exactly 8 digits.");
      setSavedMessage("");
      return;
    }

    if (!isSouthAfricanIdNumber(normalizedPayload.idNumber)) {
      setErrorMessage("Please enter a valid South African ID Number.");
      setSavedMessage("");
      return;
    }

    if (!isSouthAfricanBankName(normalizedPayload.bankName)) {
      setErrorMessage("Please select a valid South African bank.");
      setSavedMessage("");
      return;
    }

    if (!isValidBankAccountNumber(normalizedPayload.bankName, normalizedPayload.accountNumber)) {
      setErrorMessage(
        `Account Number for ${normalizedPayload.bankName} must be ${getBankAccountConstraintLabel(normalizedPayload.bankName)}.`
      );
      setSavedMessage("");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedPayload),
      });

      const body = (await response.json()) as {
        error?: string;
        user?: DashboardProfile;
      };

      if (!response.ok) {
        setErrorMessage(body.error ?? "Profile update failed.");
        setSavedMessage("");
        return;
      }

      if (body.user) {
        const nextProfile = {
          fullName: body.user.fullName ?? "",
          email: body.user.email ?? "",
          phone: body.user.phone ?? "",
          idNumber: body.user.idNumber ?? "",
          persalNumber: body.user.persalNumber ?? "",
          bankName: body.user.bankName ?? "",
          accountNumber: body.user.accountNumber ?? "",
          profileImage: body.user.profileImage ?? null,
        };
        setProfile(nextProfile);
        setInitialProfile(nextProfile);
      }

      setSavedMessage("Profile updated successfully.");
      setErrorMessage("");
      setIsEditing(false);
    } catch {
      setErrorMessage("Profile update failed. Please try again.");
      setSavedMessage("");
    } finally {
      setIsSaving(false);
    }
  }

  function removePhoto() {
    if (!isEditing) return;
    updateField("profileImage", null);
  }

  function handleEditDetails() {
    setSavedMessage("");
    setErrorMessage("");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setProfile(initialProfile);
    setSavedMessage("");
    setErrorMessage("");
    setIsEditing(false);
  }

  function handlePreferencesUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSavedMessage("Communication preferences updated.");
    setErrorMessage("");
  }

  if (loading) return <div className="text-center py-8">Loading profile...</div>;

  const firstName = (profile.fullName || "").split(" ")[0] || "there";

  return (
    <section className="max-w-6xl mx-auto py-6 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-8">
        <aside className="pt-3">
          <nav className="space-y-4 text-base">
            <button
              type="button"
              onClick={() => setActiveSection("profile")}
              className={`block pb-1 w-fit transition ${activeSection === "profile" ? "text-persal-blue font-medium border-b-2 border-persal-blue" : "text-gray-600 hover:text-persal-blue"}`}
            >
              My profile
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("employment")}
              className={`block pb-1 w-fit transition ${activeSection === "employment" ? "text-persal-blue font-medium border-b-2 border-persal-blue" : "text-gray-600 hover:text-persal-blue"}`}
            >
              Employment details
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("banking")}
              className={`block pb-1 w-fit transition ${activeSection === "banking" ? "text-persal-blue font-medium border-b-2 border-persal-blue" : "text-gray-600 hover:text-persal-blue"}`}
            >
              My banking details
            </button>
          </nav>
        </aside>

        <div>
          <h1 className="text-4xl md:text-[42px] text-gray-800 font-normal mb-8">Hi {firstName}</h1>

          {activeSection === "profile" && (
            <>
          <div className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <div className="text-gray-700">Name</div>
              <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{profile.fullName || "—"}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <div className="text-gray-700">Email</div>
              <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{profile.email || "—"}</div>
            </div>
            <div className="md:pl-[236px]"><a href="#" className="text-persal-blue hover:underline">Change your email</a></div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <div className="text-gray-700">Cell phone number</div>
              <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{profile.phone || "—"}</div>
            </div>
            <div className="md:pl-[236px]"><a href="#" className="text-persal-blue hover:underline">Change your cell phone number</a></div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <div className="text-gray-700">Current Address</div>
              <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{profile.address || "No address saved"}</div>
            </div>
            <div className="md:pl-[236px]"><a href="#" className="text-persal-blue hover:underline">Change your address</a></div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <div className="text-gray-700">Password</div>
              <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">••••••••••••</div>
            </div>
            <div className="md:pl-[236px]"><a href="#" className="text-persal-blue hover:underline">Change your password</a></div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
              <div className="text-gray-700">Preferences</div>
              <div className="text-gray-700">Not happy to receive communication from Persal</div>
            </div>
            <div className="md:pl-[236px]"><a href="#communication-preferences" className="text-persal-blue hover:underline">Change your preferences</a></div>
          </div>

          <form id="communication-preferences" onSubmit={handlePreferencesUpdate} className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-2xl md:text-3xl text-gray-700">Please update your communication preference below.</h2>
            <p className="mt-4 text-gray-600 text-lg">Your current communication preference is indicated below.</p>

            <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-gray-600 text-lg">I am happy to receive updates and other communications from Persal via email and sms.</p>
              <div className="flex items-center gap-5 text-gray-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="communicationPreference"
                    checked={receivesCommunication}
                    onChange={() => setReceivesCommunication(true)}
                    className="h-5 w-5"
                  />
                  <span>Yes</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="communicationPreference"
                    checked={!receivesCommunication}
                    onChange={() => setReceivesCommunication(false)}
                    className="h-5 w-5"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between">
              <a href="#" className="text-persal-blue hover:underline">Cancel</a>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-10 py-3 min-w-[220px] transition"
              >
                Update
              </button>
            </div>
          </form>

          {savedMessage && <div className="mt-4 text-sm font-medium text-green-700">{savedMessage}</div>}
          {errorMessage && <div className="mt-2 text-sm font-medium text-red-600">{errorMessage}</div>}
            </>
          )}

          {activeSection === "employment" && (
            <div className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Employment status</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700 flex items-center justify-between">
                  <span>Self-employed</span>
                  <ChevronDown className="text-persal-blue" size={22} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Gross monthly income (before tax &amp; deductions)</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">R 7500</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Net monthly income (after tax &amp; deductions)</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">R 6000</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Frequency of income</div>
                <div className="rounded-xl bg-white border border-gray-200 px-5 py-3 text-gray-700 flex items-center justify-between">
                  <span>Monthly</span>
                  <ChevronDown className="text-persal-blue" size={22} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Salary day</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">25</div>
              </div>

              <div className="md:pl-[236px]"><a href="#" className="text-persal-blue hover:underline">Change your employment details</a></div>
            </div>
          )}

          {activeSection === "banking" && (
            <div className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Bank name</div>
                <div className="rounded-xl bg-white border border-gray-200 px-5 py-3 text-gray-700 flex items-center justify-between">
                  <span>{profile.bankName || "Capitec"}</span>
                  <ChevronDown className="text-persal-blue" size={22} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Account number</div>
                <div className="rounded-xl bg-gray-100 border border-gray-200 px-5 py-3 text-gray-700">{profile.accountNumber || "1729841846"}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-center">
                <div className="text-gray-700">Account type</div>
                <div className="rounded-xl bg-white border border-gray-200 px-5 py-3 text-gray-700 flex items-center justify-between">
                  <span>Savings account</span>
                  <ChevronDown className="text-persal-blue" size={22} />
                </div>
              </div>

              <div className="md:pl-[236px]"><a href="#" className="text-persal-blue hover:underline">Change your banking details</a></div>
            </div>
          )}
        </div>
      </div>

      {cropOpen && cropSource && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Adjust Profile Photo</h3>
            <p className="text-sm text-gray-600 mb-4">Center your face, then tap Use Photo.</p>

            <div className="mx-auto h-[220px] w-[220px] rounded-full overflow-hidden border border-gray-200 bg-gray-100 relative">
              <img
                src={cropSource}
                alt="Crop preview"
                className="absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: "220px",
                  height: "220px",
                  objectFit: "cover",
                  transform: `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${cropZoom})`,
                  transformOrigin: "center",
                }}
              />
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={cropZoom}
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Move Left / Right</label>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  step={1}
                  value={cropX}
                  onChange={(e) => setCropX(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Move Up / Down</label>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  step={1}
                  value={cropY}
                  onChange={(e) => setCropY(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCropOpen(false);
                  setCropSource(null);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="w-full px-4 py-2 rounded-lg bg-persal-blue text-white font-semibold"
              >
                Use Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
