"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@doloyal/ui";
import { ThemeInitializer } from "@/components/theme-initializer";

/**
 * App-wide providers only. Session, workspace and currency providers live in
 * the route groups that use them (see components/app-providers.tsx) so the
 * public site does not download or run them.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 90_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="doloyal-theme"
      disableTransitionOnChange
    >
      <ThemeInitializer />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster richColors closeButton position="bottom-right" toastOptions={{ duration: 4000, style: { borderRadius: "var(--radius)", fontSize: "0.875rem" } }} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
