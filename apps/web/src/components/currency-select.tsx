"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES } from "@/lib/currency";

export function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const active = CURRENCIES.find((c) => c.code === currency);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))] transition-colors"
      >
        <span className="text-base leading-none">{active?.symbol}</span>
        <span className="hidden sm:inline">{currency}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] py-1 shadow-lg">
          <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
            Currency
          </div>
          <div className="max-h-64 overflow-y-auto">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[rgb(var(--color-muted))]"
              >
                <span className="w-8 text-center text-base">{c.symbol}</span>
                <span className="flex-1">
                  <span className="font-medium">{c.code}</span>
                  <span className="ml-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                    {c.name}
                  </span>
                </span>
                {c.code === currency && (
                  <Check className="h-4 w-4 text-[rgb(var(--color-primary))]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}