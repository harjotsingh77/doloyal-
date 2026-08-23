import { redirect } from "next/navigation";

/**
 * Settings is now a multi-section area. `/app/settings` lands on Profile.
 */
export default function SettingsIndexPage() {
  redirect("/app/settings/profile");
}
