"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
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
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#FCFBFA] font-[family-name:var(--font-inter,ui-sans-serif,system-ui)] text-[#282628] antialiased"
        style={{ margin: 0 }}
      >
        <div className="flex min-h-screen flex-col items-center justify-center px-5 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Something went wrong</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#282628] sm:text-4xl">
            Something unexpected happened
          </h1>

          <p className="mt-4 max-w-md text-base font-normal text-gray-600">
            The application hit a critical error. Please try again, and if the
            issue persists, contact support.
          </p>

          <button
            onClick={reset}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#232529] px-6 py-3 text-[15px] font-semibold text-white shadow-xl transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Try again</span>
          </button>
        </div>
      </body>
    </html>
  );
}