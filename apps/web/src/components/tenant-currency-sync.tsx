"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCY_MAP, STORAGE_KEY } from "@/lib/currency";

/**
 * Keeps dashboard display currency and tenant.currency aligned.
 *
 * - Seeds display from tenant when the user has no localStorage pick yet.
 * - If a header selection already exists in localStorage, pushes it to the
 *   tenant once so Client Page / public book prices match the header.
 * - Does not overwrite a stored header pick from tenant refetches.
 */
export function TenantCurrencySync() {
  const { isAuthenticated, isLoading } = useAuth();
  const { setCurrency } = useCurrency();
  const { data: tenant } = useTenant();
  const updateTenant = useUpdateTenant();
  const pushed = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!tenant?.currency || !CURRENCY_MAP.has(tenant.currency)) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && CURRENCY_MAP.has(stored)) {
      if (!pushed.current && stored !== tenant.currency) {
        pushed.current = true;
        updateTenant.mutate({ currency: stored });
      }
      return;
    }

    setCurrency(tenant.currency);
  }, [isLoading, isAuthenticated, tenant?.currency, setCurrency, updateTenant]);

  return null;
}
