"use client";

import { AuthGuard } from "@/lib/auth";
import { AppProviders } from "@/components/app-providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders workspace>
      <AuthGuard>{children}</AuthGuard>
    </AppProviders>
  );
}
