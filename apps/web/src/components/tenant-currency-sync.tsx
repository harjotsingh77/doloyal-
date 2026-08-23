"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant-query";
import { useCurrency } from "@/lib/currency-context";

/**
 * Loads the tenant's saved currency from the cached tenant query on app start.
 * Shares the same React Query entry as the Settings pages, so the tenant is
 * fetched at most once per stale window no matter how many consumers exist.
 */
export function TenantCurrencySync() {
  const { isAuthenticated, isLoading } = useAuth();
  const { setCurrency } = useCurrency();
  const { data: tenant } = useTenant();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (tenant?.currency) setCurrency(tenant.currency);
    // Keep localStorage in sync for the pre-hydration currency bootstrap.
    if (tenant?.currency) localStorage.setItem("doloyal_currency", tenant.currency);
  }, [isLoading, isAuthenticated, tenant?.currency, setCurrency]);

  return null;
}
