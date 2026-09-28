import { AppProviders } from "@/components/app-providers";

// Public booking sites use the customer (client) session only.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders session="client">{children}</AppProviders>;
}
