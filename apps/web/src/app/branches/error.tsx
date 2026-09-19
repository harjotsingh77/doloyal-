"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

/**
 * Segment boundary for the branch workspace.
 *
 * Without this, a render error on any single page unmounts the whole app
 * shell and falls through to the root boundary, so the user loses the sidebar
 * and has no way back other than the browser. Scoping it here keeps the shell
 * intact and makes "Try again" re-render just the failed page.
 */
export default function BranchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 py-1.5 text-[13px] font-semibold text-[rgb(var(--color-muted-foreground))]">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Something went wrong</span>
      </div>

      <h3 className="mt-5 text-lg font-semibold">This page ran into a problem</h3>
      <p className="mt-1 max-w-md text-sm text-[rgb(var(--color-muted-foreground))]">
        The rest of your workspace is still available. Try again, and if it
        keeps happening, contact support.
      </p>

      <button
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
      >
        <RefreshCcw className="h-4 w-4" />
        <span>Try again</span>
      </button>
    </div>
  );
}
