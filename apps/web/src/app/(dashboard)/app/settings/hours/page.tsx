"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input, Button, Switch, cn } from "@doloyal/ui";
import type { BusinessDayHours, BusinessHoursSettings, Tenant } from "@doloyal/shared";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useSettingsChrome, useUnsavedGuard } from "../settings-chrome";
import {
  SettingsSection,
  SaveBar,
  SettingsSkeleton,
  SettingsError,
  jsonEqual,
} from "../settings-ui";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayDraft = Required<Pick<BusinessDayHours, "open" | "close" | "breakStart" | "breakEnd">> & {
  isAvailable: boolean;
};

type HoursDraft = Record<(typeof DAYS)[number], DayDraft>;

function draftFrom(t: Tenant): HoursDraft {
  const days = t.businessHours?.days ?? null;
  return Object.fromEntries(
    DAYS.map((day) => {
      const stored = days?.[day];
      const closedByLegacy = (t.businessHours?.weeklyOff ?? []).includes(day);
      return [
        day,
        {
          open: stored?.open || t.businessHours?.openingTime || "09:00",
          close: stored?.close || t.businessHours?.closingTime || "18:00",
          breakStart: stored?.breakStart ?? "",
          breakEnd: stored?.breakEnd ?? "",
          isAvailable: stored ? stored.isAvailable !== false : !closedByLegacy,
        },
      ];
    }),
  ) as HoursDraft;
}

/** Persist the per-day map plus legacy summary fields for older consumers. */
function toSettings(draft: HoursDraft): BusinessHoursSettings {
  const openDays = DAYS.filter((d) => draft[d].isAvailable);
  const weeklyOff = DAYS.filter((d) => !draft[d].isAvailable);
  const first = openDays[0] ? draft[openDays[0]] : null;
  return {
    days: Object.fromEntries(
      DAYS.map((d) => [
        d,
        {
          open: draft[d].open,
          close: draft[d].close,
          breakStart: draft[d].breakStart,
          breakEnd: draft[d].breakEnd,
          isAvailable: draft[d].isAvailable,
        },
      ]),
    ),
    openingTime: first?.open ?? "",
    closingTime: first?.close ?? "",
    breakStart: first?.breakStart ?? "",
    breakEnd: first?.breakEnd ?? "",
    weeklyOff: [...weeklyOff],
  };
}

function validate(draft: HoursDraft): string | null {
  for (const day of DAYS) {
    const d = draft[day];
    if (!d.isAvailable) continue;
    if (!d.open || !d.close) return `${day}: opening and closing times are required`;
    if (d.close <= d.open) return `${day}: closing time must be after opening time`;
    if ((d.breakStart && !d.breakEnd) || (!d.breakStart && d.breakEnd))
      return `${day}: break needs both a start and an end time`;
    if (d.breakStart && d.breakEnd && (d.breakStart < d.open || d.breakEnd > d.close))
      return `${day}: break must fall inside opening hours`;
  }
  return null;
}

function to12h(value: string): string {
  if (!value) return "—";
  const [hStr, m] = value.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

export default function BusinessHoursSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();

  const [draft, setDraft] = React.useState<HoursDraft | null>(null);
  const [baseline, setBaseline] = React.useState<HoursDraft | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (tenant && !draft) {
      const d = draftFrom(tenant);
      setDraft(d);
      setBaseline(d);
    }
  }, [tenant, draft]);

  const dirty = !!draft && !!baseline && !jsonEqual(draft, baseline);
  useUnsavedGuard(dirty);

  if (isLoading || !tenant || !draft) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const setDay = (day: keyof HoursDraft, patch: Partial<DayDraft>) =>
    setDraft((p) => (p ? { ...p, [day]: { ...p[day], ...patch } } : p));

  const applyMondayToWeekdays = () => {
    setDraft((p) => {
      if (!p) return p;
      const mon = p.Monday;
      return {
        ...p,
        ...Object.fromEntries(
          ["Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => [
            d,
            { ...mon },
          ]),
        ),
      } as HoursDraft;
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    setStatus("saving");
    try {
      await updateTenant.mutateAsync({ businessHours: toSettings(draft) });
      setBaseline(draft);
      setStatus("saved");
      toast.success("Business hours updated");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => baseline && setDraft(baseline);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Business Hours</h2>
          <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
            Your weekly schedule, shown to customers on your booking page.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={applyMondayToWeekdays}>
          Apply Monday to weekdays
        </Button>
      </div>

      <SettingsSection>
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))]">
          <div className="hidden items-center gap-3 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.5)] px-4 py-2.5 text-xs font-medium text-[rgb(var(--color-muted-foreground))] md:flex">
            <span className="w-24 shrink-0">Day</span>
            <span className="grid flex-1 grid-cols-2 gap-3 xl:grid-cols-4">
              <span>Opens</span>
              <span>Closes</span>
              <span>
                Break start<span className="xl:hidden"> / end</span>
              </span>
              <span className="hidden xl:block">Break end</span>
            </span>
            <span className="w-14 shrink-0 text-right">Open</span>
          </div>
          {DAYS.map((day, idx) => {
            const d = draft[day];
            return (
              <div
                key={day}
                className={cn(
                  "flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center",
                  idx > 0 && "border-t border-[rgb(var(--color-border))]",
                  !d.isAvailable && "bg-[rgb(var(--color-muted)/0.3)]",
                )}
              >
                <div className="flex w-24 shrink-0 items-center justify-between gap-3">
                  <span className="text-sm font-medium">{day}</span>
                  {!d.isAvailable ? (
                    <span className="text-xs text-[rgb(var(--color-subtle))] md:hidden">Closed</span>
                  ) : (
                    <span className="text-xs text-[rgb(var(--color-muted-foreground))] md:hidden">
                      {to12h(d.open)} – {to12h(d.close)}
                    </span>
                  )}
                </div>
                {d.isAvailable ? (
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 xl:grid-cols-4">
                    <TimeInput
                      label={`${day} opens`}
                      value={d.open}
                      onChange={(v) => setDay(day, { open: v })}
                    />
                    <TimeInput
                      label={`${day} closes`}
                      value={d.close}
                      onChange={(v) => setDay(day, { close: v })}
                    />
                    <TimeInput
                      label={`${day} break start`}
                      value={d.breakStart}
                      onChange={(v) => setDay(day, { breakStart: v })}
                      optional
                    />
                    <TimeInput
                      label={`${day} break end`}
                      value={d.breakEnd}
                      onChange={(v) => setDay(day, { breakEnd: v })}
                      optional
                    />
                  </div>
                ) : (
                  <div className="hidden flex-1 text-sm text-[rgb(var(--color-subtle))] md:block">
                    Closed
                  </div>
                )}
                <div className="flex w-14 shrink-0 md:justify-end">
                  <Switch
                    checked={d.isAvailable}
                    onCheckedChange={(v) => setDay(day, { isAvailable: v })}
                    aria-label={`${day} open`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={discard}
        hint="Times use a 24-hour clock and are shown in your business timezone."
      />
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn("h-9 text-sm", optional && !value && "text-[rgb(var(--color-subtle))]")}
      />
    </label>
  );
}
