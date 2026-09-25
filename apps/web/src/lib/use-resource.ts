"use client";

import * as React from "react";
import { keepPreviousData, useQuery, type QueryKey } from "@tanstack/react-query";
import type { AppDataScope } from "./data-sync";
import { getStaffAuthToken } from "./access-token";
import { readQuerySnapshot, writeQuerySnapshot } from "./api-cache";

/**
 * Page data that paints from the last visit immediately, then refreshes.
 * Snapshot is read synchronously so a return visit (or sidebar prefetch)
 * does not sit on a skeleton while the network round-trip completes.
 */
export function useResource<T>(options: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  scopes: AppDataScope[];
  enabled?: boolean;
  keepPrevious?: boolean;
  /** Override default 90s — use a short window for live dashboards. */
  staleTime?: number;
  refetchInterval?: number | false;
  refetchOnMount?: boolean | "always";
}) {
  const keyText = JSON.stringify(options.queryKey);

  // Client navigations run this with `window` available, so the last payload
  // becomes React Query `initialData` on the first render — no loading flash.
  const snapshot = React.useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return readQuerySnapshot<T>(options.queryKey, getStaffAuthToken());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyText is the stable serialization of queryKey
  }, [keyText]);

  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: async () => {
      const data = await options.queryFn();
      writeQuerySnapshot(options.queryKey, getStaffAuthToken(), data);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 90_000,
    gcTime: 30 * 60_000,
    initialData: snapshot?.data,
    initialDataUpdatedAt: snapshot?.at,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    refetchInterval: options.refetchInterval,
    refetchOnMount: options.refetchOnMount,
    meta: { scopes: options.scopes },
  });

  return {
    ...query,
    // Snapshot / initialData counts as loaded so remounts do not flash a skeleton.
    isLoading: query.isLoading && query.data === undefined,
    isPending: query.isPending && query.data === undefined,
    isFetching: query.isFetching,
  };
}
