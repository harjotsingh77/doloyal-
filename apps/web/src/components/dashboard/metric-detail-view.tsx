"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  StatChart,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  EmptyState,
  Badge,
} from "@doloyal/ui";
import type { DashboardMetricDetail, MetricChangeKind } from "@doloyal/shared";
import { useCurrency } from "@/lib/currency-context";

function changeClass(kind: MetricChangeKind, invert?: boolean) {
  const up = invert ? kind === "down" : kind === "up";
  const down = invert ? kind === "up" : kind === "down";
  if (up) return "text-[rgb(var(--color-success))]";
  if (down) return "text-[rgb(var(--color-danger))]";
  return "text-[rgb(var(--color-muted-foreground))]";
}

function metricDetailPrompt(
  data: DashboardMetricDetail,
  formatValue: (value: number, unit?: DashboardMetricDetail["unit"], extraKey?: string) => string,
) {
  const supporting = (data.supporting || [])
    .slice(0, 8)
    .map((row) => `- ${row.label}: ${row.value}${row.hint ? ` (${row.hint})` : ""}`)
    .join("\n");
  const history = data.history
    .slice(0, 8)
    .map(
      (row) =>
        `- ${row.label}: current ${formatValue(row.current)}, previous ${formatValue(row.previous)}, ${row.percentChangeLabel}`,
    )
    .join("\n");

  return `KPI detail: "${data.title}".
These numbers are from the open dashboard card. Keep money in the workspace currency (never use $ unless the workspace is USD).
Current period ${data.currentPeriod.from} to ${data.currentPeriod.to}: ${formatValue(data.comparison.current)}.
Previous period ${data.previousPeriod.from} to ${data.previousPeriod.to}: ${formatValue(data.comparison.previous)}.
Change: ${data.comparison.percentChangeLabel} (${data.comparison.difference > 0 ? "+" : ""}${formatValue(data.comparison.difference)}).
${supporting ? `Supporting:\n${supporting}` : ""}
${history ? `Historical breakdown:\n${history}` : ""}
Fetch live data from the whole Doloyal SaaS to verify. If this metric is healthy, say so clearly. If it is a problem, write What's happening, Why this problem is happening, How to fix it, and How the fix will work. After those sections output the exact line <<<STRATEGIST>>> then a Business Strategist briefing (priority, risk, 30/90-day play, what to ignore).`;
}

export function MetricDetailView({
  open,
  onOpenChange,
  title,
  loading,
  error,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  loading: boolean;
  error: string | null;
  data: DashboardMetricDetail | null;
}) {
  const router = useRouter();
  const { format: fmt } = useCurrency();
  const invert = data?.metric === "inactive";

  const formatValue = React.useCallback(
    (value: number, unit = data?.unit, extraKey?: string) => {
      if (!Number.isFinite(value)) return "—";
      if (extraKey === "avgRating") return value.toFixed(1);
      if (extraKey === "aov" || extraKey === "revenue") return fmt(value);
      if (unit === "currency") return fmt(value);
      if (unit === "percent") return `${value}%`;
      return Math.round(value).toLocaleString("en-IN");
    },
    [data?.unit, fmt],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl lg:max-w-4xl">
        <DialogHeader className="pr-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>{data?.title || title}</DialogTitle>
              <DialogDescription>
                {data
                  ? `${data.currentPeriod.from} to ${data.currentPeriod.to} vs ${data.previousPeriod.from} to ${data.previousPeriod.to}`
                  : "Period comparison"}
              </DialogDescription>
            </div>
            <button
              type="button"
              disabled={!data || loading}
              onClick={() => {
                if (!data) return;
                onOpenChange(false);
                router.push(`/app/assistant?prompt=${encodeURIComponent(metricDetailPrompt(data, formatValue))}`);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[rgb(var(--color-primary)/0.25)] bg-[rgb(var(--color-primary)/0.08)] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--color-primary))] transition hover:bg-[rgb(var(--color-primary)/0.14)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </button>
          </div>
        </DialogHeader>

        {loading && !data ? (
          <div className="space-y-4">
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              Loading {title.toLowerCase()} details...
            </p>
            <Skeleton className="h-16 w-48" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <Skeleton className="h-52 w-full" />
          </div>
        ) : error && !data ? (
          <EmptyState title="Couldn't load details" description={error} />
        ) : !data ? (
          <EmptyState title="No data available for this period" />
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--color-muted-foreground))]">
                {data.title}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {formatValue(data.comparison.current)}
              </p>
              <p className={`mt-1 inline-flex items-center gap-1 text-sm font-medium ${changeClass(data.comparison.kind, invert)}`}>
                {data.comparison.kind === "up" ? <ArrowUpRight className="h-4 w-4" /> : null}
                {data.comparison.kind === "down" ? <ArrowDownRight className="h-4 w-4" /> : null}
                {data.comparison.percentChangeLabel}
                <span className="font-normal text-[rgb(var(--color-muted-foreground))]">
                  vs previous period
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SummaryTile label="Current period" value={formatValue(data.comparison.current)} hint={`${data.currentPeriod.from} – ${data.currentPeriod.to}`} />
              <SummaryTile label="Previous period" value={formatValue(data.comparison.previous)} hint={`${data.previousPeriod.from} – ${data.previousPeriod.to}`} />
              <SummaryTile
                label="Change"
                value={`${data.comparison.difference > 0 ? "+" : ""}${formatValue(data.comparison.difference)}`}
                tone={changeClass(data.comparison.kind, invert)}
              />
              <SummaryTile
                label={data.changeIsPercentagePoints ? "% change (points)" : "% change"}
                value={data.comparison.percentChangeLabel}
                tone={changeClass(data.comparison.kind, invert)}
              />
            </div>

            {data.insight ? (
              <div className="rounded-lg border border-[rgb(var(--color-border))] p-4">
                <p className="text-sm leading-6 text-[rgb(var(--color-foreground))]">{data.insight.summary}</p>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--color-muted-foreground))]">
                  Supporting data
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-[rgb(var(--color-foreground))]">
                  {data.insight.factors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-6 text-[rgb(var(--color-muted-foreground))]">
                  {data.insight.recommendation}
                </p>
              </div>
            ) : null}

            {data.empty ? (
              <EmptyState title="No data available for this period" description="There is no recorded activity for this metric in the selected range." />
            ) : (
              <StatChart
                title="Trend"
                description="Current period vs equivalent previous period"
                data={data.series}
                xKey="date"
                type="line"
                height={220}
                series={[
                  { key: "current", label: "Current period" },
                  { key: "previous", label: "Previous period" },
                ]}
                valueFormat={(v) => formatValue(v)}
              />
            )}

            <div>
              <h4 className="mb-2 text-sm font-semibold">Historical breakdown</h4>
              {data.history.length === 0 ? (
                <p className="text-sm text-[rgb(var(--color-muted-foreground))]">No data available for this period</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Previous period</TableHead>
                        {(data.extraColumns || []).map((col) => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                        <TableHead>Difference</TableHead>
                        <TableHead>% change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.history.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="whitespace-nowrap font-medium">{row.label}</TableCell>
                          <TableCell className="tabular-nums">{formatValue(row.current)}</TableCell>
                          <TableCell className="tabular-nums">{formatValue(row.previous)}</TableCell>
                          {(data.extraColumns || []).map((col) => (
                            <TableCell key={col.key} className="tabular-nums">
                              {row.extra && col.key in row.extra
                                ? formatValue(row.extra[col.key], data.unit, col.key)
                                : "—"}
                            </TableCell>
                          ))}
                          <TableCell className={`tabular-nums ${changeClass(row.kind, invert)}`}>
                            {row.difference > 0 ? "+" : ""}
                            {formatValue(row.difference)}
                          </TableCell>
                          <TableCell className={`tabular-nums ${changeClass(row.kind, invert)}`}>
                            {row.percentChangeLabel}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {data.supporting.length ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Additional insights</h4>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {data.supporting.map((stat) => (
                    <div key={stat.label} className="rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5">
                      <p className="text-[11px] text-[rgb(var(--color-muted-foreground))]">{stat.label}</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">{stat.value}</p>
                      {stat.hint ? (
                        <p className="mt-0.5 text-[11px] text-[rgb(var(--color-muted-foreground))]">{stat.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {data.records?.length ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold">{data.recordsTitle || "Details"}</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Record</TableHead>
                        <TableHead>Detail</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.records.map((row) => (
                        <TableRow
                          key={row.id}
                          className={row.href ? "cursor-pointer" : undefined}
                          onClick={() => {
                            if (!row.href) return;
                            onOpenChange(false);
                            router.push(row.href);
                          }}
                        >
                          <TableCell className="font-medium">
                            {row.title}
                            {row.meta?.Status ? (
                              <Badge variant="accent" className="ml-2 text-[0.6rem]">
                                {row.meta.Status}
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-[rgb(var(--color-muted-foreground))]">
                            {row.subtitle}
                            {row.meta?.Date ? ` · ${row.meta.Date}` : ""}
                            {row.meta?.["Days inactive"] ? ` · ${row.meta["Days inactive"]}d inactive` : ""}
                          </TableCell>
                          <TableCell className="tabular-nums">{row.value || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--color-muted-foreground))]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone || ""}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-[rgb(var(--color-muted-foreground))]">{hint}</p> : null}
    </div>
  );
}
