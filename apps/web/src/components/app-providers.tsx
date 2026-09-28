"use client";

import * as React from "react";
import { AuthProvider } from "@/lib/auth";
import { ClientAuthProvider } from "@/lib/client-auth";
import { CurrencyProvider } from "@/lib/currency-context";
import { BranchProvider } from "@/lib/branch-context";
import { QuerySync } from "@/lib/query-sync";

/**
 * Session and workspace providers for the application routes.
 *
 * These used to wrap the root layout, which put the API client, auth
 * bootstrap and their network calls (`/branches`, `/auth/me`, the client
 * portal) on every public marketing page. Each route group now mounts only
 * what it uses:
 *
 * - staff workspace (dashboard, branches):  <AppProviders workspace>
 * - staff auth / admin / onboarding:        <AppProviders>
 * - public booking site:                    <AppProviders session="client">
 * - OAuth callback (staff or client):       <AppProviders session="both">
 */
export function AppProviders({
  children,
  session = "staff",
  workspace = false,
}: {
  children: React.ReactNode;
  session?: "staff" | "client" | "both";
  /** Mount the branch registry (sidebar / branch workspace). */
  workspace?: boolean;
}) {
  let tree = (
    <CurrencyProvider>
      <QuerySync />
      {children}
    </CurrencyProvider>
  );
  if (workspace) tree = <BranchProvider>{tree}</BranchProvider>;
  if (session !== "staff") tree = <ClientAuthProvider>{tree}</ClientAuthProvider>;
  if (session !== "client") tree = <AuthProvider>{tree}</AuthProvider>;
  return tree;
}
