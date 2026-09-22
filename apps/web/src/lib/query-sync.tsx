"use client";

import * as React from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import type { AppDataScope } from "./data-sync";

const EVENT = "doloyal:data-changed";

function queryMatches(query: Query, scopes: AppDataScope[]) {
  const meta = query.meta?.scopes;
  if (!Array.isArray(meta) || meta.length === 0) return false;
  if (scopes.includes("all")) return true;
  return scopes.some((scope) => meta.includes(scope));
}

/** Targeted React Query invalidation when a mutation or another tab changes data. */
export function QuerySync() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scopes?: AppDataScope[] }>).detail;
      const scopes = detail?.scopes?.length ? detail.scopes : (["all"] as AppDataScope[]);
      void queryClient.invalidateQueries({
        predicate: (query) => queryMatches(query, scopes),
      });
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [queryClient]);

  return null;
}
