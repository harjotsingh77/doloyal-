"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency-context";

/** Loads the tenant's saved currency from the backend on app start. */
export function TenantCurrencySync() {
  const { isAuthenticated, isLoading } = useAuth();
  const { setCurrency } = useCurrency();

  React.useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    api
      .getTenant()
      .then((tenant) => {
        if (tenant.currency) setCurrency(tenant.currency);
      })
      .catch(() => {
        // Keep localStorage currency if tenant fetch fails temporarily.
      });
  }, [isAuthenticated, isLoading, setCurrency]);

  return null;
}
