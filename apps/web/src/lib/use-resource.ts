"use client";

import * as React from "react";
import { keepPreviousData, useQuery, type QueryKey } from "@tanstack/react-query";
import type { AppDataScope } from "./data-sync";
import { getStaffAuthToken } from "./access-token";
import { readQuerySnapshot, writeQuerySnapshot } from "./api-cache";

/**
 * Page data that paints from the last visit immediately, then refreshes.
 * Snapshot is read synchronously on first render (and again in useLayoutEffect
 * when the key changes) so a return visit does not sit on a skeleton.
 */
export function useResource<T>(options: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  scopes: AppDataScope[];
  enabled?: boolean;
  keepPrevious?: boolean;
}) {
  const keyText = JSON.stringify(options.queryKey);
  const [cached, setCached] = React.useState<T | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return readQuerySnapshot<T>(options.queryKey, getStaffAuthToken())?.data;
  });

  React.useLayoutEffect(() => {
    const snap = readQuerySnapshot<T>(options.queryKey, getStaffAuthToken());
    setCached(snap?.data);
  }, [keyText]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: async () => {
      const data = await options.queryFn();
      writeQuerySnapshot(options.queryKey, getStaffAuthToken(), data);
      setCached(data);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 90_000,
    gcTime: 30 * 60_000,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    meta: { scopes: options.scopes },
  });

  const data = (query.data !== undefined ? query.data : cached) as T | undefined;
  return { ...query, data };
}
