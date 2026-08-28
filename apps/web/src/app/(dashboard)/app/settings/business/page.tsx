import { redirect } from "next/navigation";

// Business settings moved into the unified Business Profile page.
export default function BusinessSettingsRedirect() {
  redirect("/app/settings/business-profile");
}
