"use client";

import * as React from "react";
import {
  DEFAULT_CURRENCY,
  STORAGE_KEY,
  convertAmount,
  formatCurrency as formatCurrencyUtil,
  formatCompactCurrency as formatCompactUtil,
  CURRENCY_MAP,
} from "./currency";

interface CurrencyContextValue {
  currency: string;
  setCurrency: (code: string) => void;
  convert: (amountInINR: number) => number;
  format: (amountInINR: number) => string;
  formatCompact: (amountInINR: number) => string;
}

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState(DEFAULT_CURRENCY);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && CURRENCY_MAP.has(stored)) {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = React.useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const convert = React.useCallback(
    (amountInINR: number) => convertAmount(amountInINR, "INR", currency),
    [currency],
  );

  const format = React.useCallback(
    (amountInINR: number) => {
      const converted = convert(amountInINR);
      return formatCurrencyUtil(converted, currency);
    },
    [convert, currency],
  );

  const formatCompact = React.useCallback(
    (amountInINR: number) => {
      const converted = convert(amountInINR);
      return formatCompactUtil(converted, currency);
    },
    [convert, currency],
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, convert, format, formatCompact }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}