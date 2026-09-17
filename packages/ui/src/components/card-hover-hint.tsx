"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Eye } from "lucide-react";

export function CardHoverHint({
  label = "View more details",
}: {
  className?: string;
  label?: string;
}) {
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const parent = hostRef.current?.parentElement;
    const tip = tipRef.current;
    if (!parent || !tip) return;

    const onMove = (e: MouseEvent) => {
      const x = Math.min(e.clientX + 14, window.innerWidth - 168);
      const y = Math.min(e.clientY + 16, window.innerHeight - 40);
      tip.style.opacity = "1";
      tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const onLeave = () => {
      tip.style.opacity = "0";
    };

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, [mounted]);

  return (
    <>
      <span ref={hostRef} className="sr-only" aria-hidden="true" />
      {mounted
        ? createPortal(
            <div
              ref={tipRef}
              aria-hidden="true"
              className="pointer-events-none fixed left-0 top-0 z-[80] inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--color-foreground))] px-2 py-1 text-[11px] font-medium text-[rgb(var(--color-background))] opacity-0 shadow-[var(--shadow-lifted)]"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              {label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
