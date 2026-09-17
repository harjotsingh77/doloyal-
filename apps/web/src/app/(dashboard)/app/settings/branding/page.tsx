import { redirect } from "next/navigation";

// Branding moved into the unified Business Profile page.
export default function BrandingSettingsRedirect() {
  redirect("/app/settings/business-profile?tab=branding");
}
