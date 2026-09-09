"use client";

import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api";
import type { Tenant } from "@doloyal/shared";

/**
 * Cached tenant access shared by every consumer (settings pages, currency
 * sync, billing summary…). One cache entry → one network request no matter
 * how many components need the tenant, and instant renders on back-navigation.
 */
export const TENANT_QUERY_KEY = ["tenant"] as const;

export function useTenant() {
  return useQuery({
    queryKey: TENANT_QUERY_KEY,
    queryFn: () => api.getTenant(),
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * Partial tenant update used by all settings pages.
 *
 * - optimistic: the cache (and therefore the UI) updates immediately
 * - rollback + error toast if the request fails
 * - server response is authoritative once it arrives
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation<Tenant, Error, Record<string, unknown>, { previous?: Tenant }>({
    mutationFn: (data) => api.updateTenantSettings(data),
    onMutate: async (data) => {
      const previous = queryClient.getQueryData<Tenant>(TENANT_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<Tenant>(TENANT_QUERY_KEY, {
          ...previous,
          ...data,
        } as Tenant);
      }
      return { previous };
    },
    onError: (err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TENANT_QUERY_KEY, context.previous);
      }
      const message = err instanceof Error ? err.message : "";
      toast.error(
        /unauthorized|authentication required|session expired/i.test(message)
          ? "Your session expired. Please sign in again."
          : message || "Unable to save changes. Try again.",
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(TENANT_QUERY_KEY, updated);
    },
  });
}

/** Imperative cache write for flows that already hold a fresh Tenant. */
export function useSetTenantCache() {
  const queryClient = useQueryClient();
  return React.useCallback(
    (tenant: Tenant) => queryClient.setQueryData(TENANT_QUERY_KEY, tenant),
    [queryClient],
  );
}
