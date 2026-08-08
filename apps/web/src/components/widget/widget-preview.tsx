"use client";

import * as React from "react";
import { X, CalendarDays } from "lucide-react";
import type { WidgetSettings } from "@doloyal/shared";

interface WidgetPreviewProps {
  settings: WidgetSettings;
  slug: string;
  tenantName: string;
}

const POSITIONS: Record<string, string> = {
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
};

export function WidgetPreview({ settings, slug, tenantName }: WidgetPreviewProps) {
  const [popupOpen, setPopupOpen] = React.useState(false);

  const bookingUrl = `https://app.doloyal.ai/book/${slug}`;

  return (
    <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-[rgb(var(--color-border))] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[rgb(var(--color-danger))]" />
          <div className="h-3 w-3 rounded-full bg-[rgb(var(--color-warning))]" />
          <div className="h-3 w-3 rounded-full bg-[rgb(var(--color-success))]" />
        </div>
        <div className="mx-auto flex h-7 w-full max-w-[320px] items-center rounded-md bg-[rgb(var(--color-muted))] px-3 text-xs text-[rgb(var(--color-muted-foreground))]">
          {bookingUrl}
        </div>
      </div>

      {/* Viewport */}
      <div className="relative mx-auto min-h-[360px] w-full max-w-[600px] bg-[rgb(var(--color-background))] p-6">
        {/* Placeholder website content */}
        {settings.theme === "dark" ? (
          <style>{`.widget-preview-content { --preview-bg: #0f172a; --preview-text: #f1f5f9; --preview-muted: #64748b; --preview-border: #334155; }`}</style>
        ) : settings.theme === "auto" ? (
          <style>{`@media (prefers-color-scheme: dark) { .widget-preview-content { --preview-bg: #0f172a; --preview-text: #f1f5f9; --preview-muted: #64748b; --preview-border: #334155; } } .widget-preview-content { --preview-bg: #ffffff; --preview-text: #0f172a; --preview-muted: #64748b; --preview-border: #e2e8f0; }`}</style>
        ) : null}

        <div
          className="widget-preview-content"
          style={{
            fontFamily: settings.fontFamily || "Inter",
            color: "rgb(var(--color-foreground))",
          }}
        >
          {/* Hero placeholder */}
          <div className="mb-6">
            <div className="mb-2 h-4 w-24 rounded bg-[rgb(var(--color-muted))]" />
            <div className="mb-1 h-6 w-56 rounded bg-[rgb(var(--color-muted))]" />
            <div className="h-3 w-40 rounded bg-[rgb(var(--color-muted))]" />
          </div>

          {/* Content cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="aspect-[4/3] rounded-lg bg-[rgb(var(--color-muted))]" />
            <div className="aspect-[4/3] rounded-lg bg-[rgb(var(--color-muted))]" />
            <div className="aspect-[4/3] rounded-lg bg-[rgb(var(--color-muted))]" />
          </div>

          <div className="mt-4 flex gap-3">
            <div className="h-3 flex-1 rounded bg-[rgb(var(--color-muted))]" />
            <div className="h-3 flex-1 rounded bg-[rgb(var(--color-muted))]" />
          </div>
        </div>

        {/* Widget rendering */}
        {settings.isActive && (
          <>
            {settings.buttonStyle === "floating" && (
              <button
                type="button"
                className={`fixed z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${POSITIONS[settings.position] || "bottom-4 right-4"}`}
                style={{ backgroundColor: settings.buttonColor }}
              >
                <CalendarDays className="h-4 w-4" />
                {settings.buttonText || "Book Appointment"}
              </button>
            )}

            {settings.buttonStyle === "inline" && (
              <div className="mt-6">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-[0.625rem] px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ backgroundColor: settings.buttonColor }}
                >
                  <CalendarDays className="h-4 w-4" />
                  {settings.buttonText || "Book Appointment"}
                </button>
              </div>
            )}

            {settings.buttonStyle === "popup" && (
              <>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setPopupOpen(true)}
                    className="flex items-center gap-2 rounded-[0.625rem] px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
                    style={{ backgroundColor: settings.buttonColor }}
                  >
                    <CalendarDays className="h-4 w-4" />
                    {settings.buttonText || "Book Appointment"}
                  </button>
                </div>

                {popupOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-[var(--radius)] bg-[rgb(var(--color-surface))] p-6 shadow-[var(--shadow-lifted)] lf-scale-in">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold" style={{ color: settings.primaryColor }}>
                          {tenantName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setPopupOpen(false)}
                          className="rounded-md p-1 text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-3 text-sm text-[rgb(var(--color-muted-foreground))]">
                        Book your appointment with {tenantName}.
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="h-10 rounded-[0.625rem] bg-[rgb(var(--color-muted))] animate-pulse" />
                        <div className="h-10 rounded-[0.625rem] bg-[rgb(var(--color-muted))] animate-pulse" />
                        <div className="h-10 rounded-[0.625rem] bg-[rgb(var(--color-muted))] animate-pulse" />
                      </div>
                      <button
                        type="button"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[0.625rem] px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        {settings.buttonText || "Book Appointment"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!settings.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-background)/0.6)] backdrop-blur-[2px]">
            <span className="rounded-full bg-[rgb(var(--color-muted))] px-4 py-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
              Widget disabled
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
