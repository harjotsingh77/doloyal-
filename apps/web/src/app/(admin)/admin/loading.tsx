"use client";

import { Skeleton } from "@doloyal/ui";

/**
 * Admin segment loading fallback — instant skeleton while the admin page
 * chunk loads, instead of holding the previous page during navigation.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-24" />
          </div>
        ))}
      </div>

      <div
        className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6"
      >
        <Skeleton className="h-5 w-40" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
