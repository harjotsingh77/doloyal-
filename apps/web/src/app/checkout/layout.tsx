import { AppProviders } from "@/components/app-providers";

// Checkout runs inside the signed-in staff session.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
