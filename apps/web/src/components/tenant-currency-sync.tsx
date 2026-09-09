"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant-query";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCY_MAP, STORAGE_KEY } from "@/lib/currency";

/**
 * Seeds display currency from the tenant only when the user has not already
 * picked one. A header selection is stored in localStorage and must not be
 * overwritten on every tenant refetch or page load.
 */
export function TenantCurrencySync() {
  const { isAuthenticated, isLoading } = useAuth();
  const { setCurrency } = useCurrency();
  const { data: tenant } = useTenant();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!tenant?.currency || !CURRENCY_MAP.has(tenant.currency)) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && CURRENCY_MAP.has(stored)) return;
    setCurrency(tenant.currency);
  }, [isLoading, isAuthenticated, tenant?.currency, setCurrency]);

  return null;
}
