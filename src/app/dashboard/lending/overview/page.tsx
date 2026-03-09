import { redirect } from "next/navigation";

export default function OverviewRedirect() {
  redirect("/dashboard/lending/apply");
  return null;
}
