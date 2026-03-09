"use client";
import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
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

  if (loading) return <div className="text-center py-8">Loading profile...</div>;

  return (
    <section className="max-w-4xl mx-auto py-6 md:py-12 flex flex-col gap-6 md:gap-8">
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-8 flex flex-col gap-6">
        <h2 className="text-xl md:text-2xl font-bold text-persal-blue">Profile Details</h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 border border-yellow-300 flex items-center justify-center">
              <Trophy size={18} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-yellow-700 font-medium">Your Points</p>
              <p className="text-base font-bold text-yellow-800">Loyalty Score</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-yellow-700">{points}</span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center text-2xl font-bold text-persal-dark">
            {profile.profileImage ? (
              <img src={profile.profileImage} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              profileInitial
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <label className="px-4 py-2 rounded-lg bg-persal-blue text-white text-sm font-semibold cursor-pointer text-center">
              Upload Picture
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={!isEditing} />
            </label>
            <button
              type="button"
              onClick={removePhoto}
              disabled={!isEditing}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Remove Picture
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              disabled={!isEditing}
              className="w-full border rounded-lg p-3 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => updateField("email", e.target.value)}
              disabled={!isEditing}
              className="w-full border rounded-lg p-3 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              disabled={!isEditing}
              className="w-full border rounded-lg p-3 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">ID Number</label>
            <input
              type="text"
              value={profile.idNumber}
              onChange={(e) => updateField("idNumber", e.target.value)}
              disabled={!isEditing}
              className="w-full border rounded-lg p-3 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Persal Number</label>
            <input
              type="text"
              value={profile.persalNumber}
              onChange={(e) => updateField("persalNumber", e.target.value)}
              disabled={!isEditing}
              className="w-full border rounded-lg p-3 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bank Name</label>
            <select
              value={profile.bankName}
              onChange={(e) => updateField("bankName", e.target.value)}
              disabled={!isEditing}
              className="w-full border rounded-lg p-3 bg-white disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="" disabled>
                Select Bank Name
              </option>
              {SOUTH_AFRICAN_BANK_NAMES.map((bankName) => (
                <option key={bankName} value={bankName}>
                  {bankName}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Account Number</label>
            <input
              type="text"
              value={profile.accountNumber}
              onChange={(e) => updateField("accountNumber", e.target.value)}
              disabled={!isEditing}
              className="w-full border rounded-lg p-3 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleEditDetails}
              className="w-full md:w-auto px-6 py-3 bg-persal-blue text-white rounded-xl font-semibold hover:bg-persal-dark transition"
            >
              Update Details
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full md:w-auto px-6 py-3 bg-persal-blue text-white rounded-xl font-semibold hover:bg-persal-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="w-full md:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </>
          )}
          {savedMessage && <span className="text-sm font-medium text-green-700">{savedMessage}</span>}
          {errorMessage && <span className="text-sm font-medium text-red-600">{errorMessage}</span>}
        </div>
      </form>

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
