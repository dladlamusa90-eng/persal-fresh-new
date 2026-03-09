export type DashboardProfile = {
  fullName: string;
  persalNumber: string;
  email: string;
  phone: string;
  idNumber: string;
  bankName: string;
  accountNumber: string;
  profileImage: string | null;
};

export const DASHBOARD_PROFILE_STORAGE_KEY = "dashboard_profile_v1";

export const defaultDashboardProfile: DashboardProfile = {
  fullName: "Thabo Mokoena",
  persalNumber: "12345678",
  email: "thabo.mokoena@gov.za",
  phone: "+27 82 123 4567",
  idNumber: "9203045678901",
  bankName: "ABSA",
  accountNumber: "1234567890",
  profileImage: null,
};

export function getStoredDashboardProfile(): DashboardProfile {
  if (typeof window === "undefined") return defaultDashboardProfile;

  const raw = window.localStorage.getItem(DASHBOARD_PROFILE_STORAGE_KEY);
  if (!raw) return defaultDashboardProfile;

  try {
    const parsed = JSON.parse(raw) as Partial<DashboardProfile> & {
      name?: string;
    };

    return {
      fullName: parsed.fullName ?? parsed.name ?? defaultDashboardProfile.fullName,
      persalNumber: parsed.persalNumber ?? defaultDashboardProfile.persalNumber,
      email: parsed.email ?? defaultDashboardProfile.email,
      phone: parsed.phone ?? defaultDashboardProfile.phone,
      idNumber: parsed.idNumber ?? defaultDashboardProfile.idNumber,
      bankName: parsed.bankName ?? defaultDashboardProfile.bankName,
      accountNumber: parsed.accountNumber ?? defaultDashboardProfile.accountNumber,
      profileImage: parsed.profileImage ?? null,
    };
  } catch {
    return defaultDashboardProfile;
  }
}

export function saveDashboardProfile(profile: DashboardProfile) {
  if (typeof window === "undefined") {
    return { ok: false as const, error: "Storage is not available." };
  }

  try {
    window.localStorage.setItem(DASHBOARD_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event("dashboard-profile-updated"));
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Profile could not be saved. Please use a smaller image and try again.",
    };
  }
}

export function getProfileInitial(fullName: string) {
  const initial = fullName.trim().charAt(0);
  return initial ? initial.toUpperCase() : "P";
}
