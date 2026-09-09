"use client";

import * as React from "react";
import nextDynamic from "next/dynamic";
import { X } from "lucide-react";
import { cn } from "@doloyal/ui";
import { useAskDoloyal } from "./ask-doloyal-context";

/**
 * The full support panel (conversation state, composer, markdown renderer)
 * is code-split and only fetched the first time the user opens the chat.
 * The floating button itself stays tiny so every page keeps a fast
 * interactive shell.
 */
const AskDoloyalPanel = nextDynamic(
  () => import("./ask-doloyal-panel").then((m) => m.AskDoloyalPanel),
  { ssr: false },
);

export function AskDoloyalWidget() {
  const { isOpen, toggle, unread } = useAskDoloyal();
  const [everOpened, setEverOpened] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setEverOpened(true);
  }, [isOpen]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggle}
        aria-label={isOpen ? "Close Ask Doloyal" : "Open Ask Doloyal"}
        data-ask-doloyal-fab=""
        className={cn(
          "fixed bottom-5 right-5 z-[70] flex items-center justify-center rounded-full transition-[bottom,transform] duration-200 hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6",
          isOpen
            ? "bg-[rgb(var(--color-primary))] p-3.5 text-white shadow-lg shadow-black/20"
            : "p-0 drop-shadow-xl",
        )}
        style={{ height: 56, width: 56 }}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <img
            src="/ask-doloyal-icon.png"
            alt="Ask Doloyal"
            className="h-full w-full object-contain select-none pointer-events-none"
          />
        )}
        {!isOpen && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--color-danger))] px-1 text-[0.65rem] font-bold text-white ring-2 ring-[rgb(var(--color-background))]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel — mounted after first open, stays mounted to preserve chat
          state across close/reopen (same behavior as before). */}
      {everOpened ? <AskDoloyalPanel /> : null}
    </>
  );
}
