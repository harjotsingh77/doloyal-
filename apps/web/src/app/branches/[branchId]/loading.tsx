"use client";

import { Skeleton } from "@doloyal/ui";

/**
 * Branch workspace loading fallback — instant skeleton while a branch page
 * chunk loads, instead of holding the previous page during navigation.
 */
export default function BranchWorkspaceLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
          </div>
        ))}
      </div>

      <div
        className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6"
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-1 h-3 w-48" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    </div>
  );
}
