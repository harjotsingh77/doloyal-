import { AppProviders } from "@/components/app-providers";

// The admin shell (admin/layout.tsx) reads the staff session.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
