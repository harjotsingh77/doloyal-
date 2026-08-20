"use client";

import * as React from "react";
import { AskDoloyalProvider } from "./ask-doloyal-context";
import { AskDoloyalWidget } from "./ask-doloyal-widget";

export { AskDoloyalProvider, useAskDoloyal } from "./ask-doloyal-context";
export { AskDoloyalWidget } from "./ask-doloyal-widget";

/** Drop-in wrapper: provider + floating widget for an authenticated layout. */
export function AskDoloyal(props: { children: React.ReactNode }) {
  return (
    <AskDoloyalProvider>
      {props.children}
      <AskDoloyalWidget />
    </AskDoloyalProvider>
  );
}