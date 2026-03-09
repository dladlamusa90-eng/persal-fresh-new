import { redirect } from "next/navigation";

export default function DashboardRedirect() {
  redirect("/dashboard/lending/overview");
  return null;
}
