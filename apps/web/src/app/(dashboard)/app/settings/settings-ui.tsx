"use client";

import * as React from "react";
import { Trash2, ImageIcon, Bold, Italic, Underline, List } from "lucide-react";
import { Button, Switch, Skeleton, cn } from "@doloyal/ui";

/* ── Section ───────────────────────────────────────────────────────────────
 * A titled group inside a page. Deliberately NOT a floating card: sections
 * are separated by hairline borders so long pages stay calm and structured.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-[rgb(var(--color-border))] py-6 first:border-t-0 first:pt-0", className)}>
      {title ? (
        <div className="mb-4">
          <h2 className="text-base font-semibold leading-tight tracking-tight text-[rgb(var(--color-foreground))]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ── Row ───────────────────────────────────────────────────────────────────
 * Label + optional description on the left, control on the right. The basic
 * building block for compact, scannable settings.
 */
export function SettingRow({
  label,
  description,
  children,
  htmlFor,
  stacked,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
  /** Stack control under the label instead of side-by-side. */
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="py-3">
        <div className="mb-2">
          <label htmlFor={htmlFor} className="text-sm font-medium text-[rgb(var(--color-foreground))]">
            {label}
          </label>
          {description ? (
            <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-md">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[rgb(var(--color-foreground))]">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-[rgb(var(--color-muted-foreground))]">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0 sm:w-[16rem]">{children}</div>
    </div>
  );
}

/* ── Toggle row ──────────────────────────────────────────────────────────── */
export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[rgb(var(--color-foreground))]">{label}</div>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-[rgb(var(--color-muted-foreground))]">{description}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

/* ── Sticky save bar for explicit-save pages ─────────────────────────────── */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  hint,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  hint?: string;
}) {
  if (!dirty && !saving) return null;
  return (
    // Right padding keeps clear of the floating chat button on small screens.
    <div className="sticky bottom-4 z-20 mt-8 pr-[4.25rem] sm:pr-0">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 py-3 shadow-[var(--shadow-lifted)]">
        <span className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">
          {saving ? "Saving…" : hint || "You have unsaved changes"}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {onDiscard ? (
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onDiscard}>
              Discard
            </Button>
          ) : null}
          <Button type="button" size="sm" loading={saving} disabled={!dirty} onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Page-level loading skeleton ─────────────────────────────────────────── */
export function SettingsSkeleton() {
  return (
    <div className="max-w-3xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-4 rounded-xl border border-[rgb(var(--color-border))] p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
      <div className="space-y-4 rounded-xl border border-[rgb(var(--color-border))] p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    </div>
  );
}

/* ── Error state ─────────────────────────────────────────────────────────── */
export function SettingsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex max-w-lg flex-col items-start py-12">
      <h2 className="text-base font-semibold">Couldn’t load settings</h2>
      <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{message}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

/* ── Image upload field (logo / cover / favicon) ─────────────────────────── */
export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  aspect = "square",
}: {
  label: string;
  hint?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  aspect?: "square" | "banner" | "icon";
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const sizeClass =
    aspect === "banner"
      ? "h-28 w-full max-w-md"
      : aspect === "icon"
        ? "h-14 w-14"
        : "h-20 w-20";

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result));
      setBusy(false);
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {hint ? (
        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{hint}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.35)]",
            sizeClass,
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[rgb(var(--color-muted-foreground))]">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) readFile(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            {value ? "Replace" : "Upload"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Lightweight rich-text editor for legal policies ─────────────────────── */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string) => {
    document.execCommand(command);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="overflow-hidden rounded-[0.625rem] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] focus-within:border-[rgb(var(--color-primary))] focus-within:ring-2 focus-within:ring-[rgb(var(--color-primary)/0.25)]">
      <div className="flex items-center gap-1 border-b border-[rgb(var(--color-border))] px-2 py-1.5">
        {[
          { cmd: "bold", icon: Bold },
          { cmd: "italic", icon: Italic },
          { cmd: "underline", icon: Underline },
          { cmd: "insertUnorderedList", icon: List },
        ].map(({ cmd, icon: Icon }) => (
          <button
            key={cmd}
            type="button"
            aria-label={cmd}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
            onMouseDown={(e) => {
              e.preventDefault();
              exec(cmd);
            }}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        className="min-h-[140px] px-3.5 py-2.5 text-sm outline-none empty:before:pointer-events-none empty:before:text-[rgb(var(--color-subtle))] empty:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder || "Write policy content…"}
        onInput={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
      />
    </div>
  );
}

/* ── Helpers shared by several pages ─────────────────────────────────────── */

export function isHexColor(value: string | null | undefined): boolean {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true; // empty is fine — optional field
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Compare drafts structurally without key-order sensitivity. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
