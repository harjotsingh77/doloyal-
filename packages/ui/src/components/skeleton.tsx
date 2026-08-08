"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[0.625rem] bg-[rgb(var(--color-muted))]",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/10 before:animate-[lf-shimmer_1.6s_infinite]",
        className,
      )}
      {...props}
    />
  );
}
