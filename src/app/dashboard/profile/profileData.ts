export type DashboardProfile = {
  fullName: string;
  persalNumber: string;
  email: string;
  phone: string;
  idNumber: string;
  bankName: string;
  accountNumber: string;
  profileImage: string | null;
  address?: string;
};

export const defaultDashboardProfile: DashboardProfile = {
  fullName: "",
  persalNumber: "",
  email: "",
  phone: "",
  idNumber: "",
  bankName: "",
  accountNumber: "",
  profileImage: null,
  address: "",
};

export function getProfileInitial(fullName: string) {
  const initial = fullName.trim().charAt(0);
  return initial ? initial.toUpperCase() : "P";
}
