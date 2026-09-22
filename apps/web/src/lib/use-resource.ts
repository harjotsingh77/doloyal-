"use client";

import { keepPreviousData, useQuery, type QueryKey } from "@tanstack/react-query";
import type { AppDataScope } from "./data-sync";

/**
 * Page data that survives client-side navigation.
 * Fresh for 90s, kept for 10 minutes, invalidated when a matching mutation fires.
 */
export function useResource<T>(options: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  scopes: AppDataScope[];
  enabled?: boolean;
  keepPrevious?: boolean;
}) {
  return useQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    enabled: options.enabled ?? true,
    staleTime: 90_000,
    gcTime: 10 * 60_000,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    meta: { scopes: options.scopes },
  });
}
