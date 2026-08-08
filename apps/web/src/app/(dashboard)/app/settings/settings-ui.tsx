"use client";

import * as React from "react";
import { Upload, Trash2, ImageIcon, Bold, Italic, Underline, List } from "lucide-react";
import { Button, Switch, cn } from "@doloyal/ui";

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
      ? "h-32 w-full max-w-xl"
      : aspect === "icon"
        ? "h-16 w-16"
        : "h-24 w-24";

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
            <img src={value} alt={label} className="h-full w-full object-cover" />
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
            <Upload className="h-3.5 w-3.5" />
            {value ? "Replace" : "Upload"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
    <div className="overflow-hidden rounded-[0.625rem] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
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
        className="min-h-[120px] px-3.5 py-2.5 text-sm outline-none empty:before:pointer-events-none empty:before:text-[rgb(var(--color-subtle))] empty:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder || "Write policy content…"}
        onInput={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
      />
    </div>
  );
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      style={{
        animation: `settingsFadeUp 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
      }}
    >
      <div className="flex items-start gap-3 border-b border-[rgb(var(--color-border))] px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
            {description}
          </p>
        </div>
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgb(var(--color-border))] px-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description ? (
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{description}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
