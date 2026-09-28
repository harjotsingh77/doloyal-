import { AppProviders } from "@/components/app-providers";

// Branch workspaces share the staff session and branch registry.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders workspace>{children}</AppProviders>;
}
