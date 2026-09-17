import { redirect } from "next/navigation";

// Business hours moved into the unified Business Profile page.
export default function HoursSettingsRedirect() {
  redirect("/app/settings/business-profile?tab=hours");
}
