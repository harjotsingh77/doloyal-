import { redirect } from "next/navigation";

// Language & region settings moved into the unified Business Profile page.
export default function PreferencesSettingsRedirect() {
  redirect("/app/settings/business-profile?tab=location");
}
