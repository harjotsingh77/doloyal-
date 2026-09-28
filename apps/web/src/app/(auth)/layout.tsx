import { AppProviders } from "@/components/app-providers";

// Sign-in, sign-up and invite acceptance need the staff session.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
