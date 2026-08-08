"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@doloyal/ui";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/lib/auth";
import { CurrencyProvider } from "@/lib/currency-context";
import { BranchProvider } from "@/lib/branch-context";
import { ThemeInitializer } from "@/components/theme-initializer";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "52760212997-pjqa4vbuqnia85ucj7vu5a12j4hmna61.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        storageKey="doloyal-theme"
        disableTransitionOnChange
      >
        <ThemeInitializer />
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={200}>
            <AuthProvider>
              <BranchProvider>
                <CurrencyProvider>{children}</CurrencyProvider>
              </BranchProvider>
            </AuthProvider>
          </TooltipProvider>
          <Toaster richColors closeButton position="bottom-right" toastOptions={{ duration: 4000, style: { borderRadius: "var(--radius)", fontSize: "0.875rem" } }} />
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
