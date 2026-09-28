import { AppProviders } from "@/components/app-providers";

// Onboarding runs inside the signed-in staff session.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
