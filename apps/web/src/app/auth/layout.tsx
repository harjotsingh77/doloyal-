import { AppProviders } from "@/components/app-providers";

// OAuth callback finishes either a staff or a booking-site (client) sign-in.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders session="both">{children}</AppProviders>;
}
