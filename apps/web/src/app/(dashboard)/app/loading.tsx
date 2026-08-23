"use client";

import { Skeleton } from "@doloyal/ui";

/**
 * Segment-level loading fallback.
 *
 * Shown by the App Router the moment a navigation starts (while the new
 * page chunk downloads/parses), so route changes feel instant instead of
 * holding the previous page. Mirrors the common page anatomy
 * (PageHeader + KPI row + two-column content) using the existing Skeleton
 * component so the visual system is unchanged.
 */
export default function AppLoading() {
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-48" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
