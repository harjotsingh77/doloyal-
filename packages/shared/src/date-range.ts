/** Inclusive YYYY-MM-DD period math used by the dashboard and KPI details. */

const DAY_MS = 86_400_000;

export const DASHBOARD_METRICS = [
  "revenue",
  "customers",
  "repeat_rate",
  "new_customers",
  "inactive",
  "points",
  "orders",
  "reviews",
  "appointments",
  "memberships",
  "ai_revenue",
  "ai_retention",
] as const;

export type ChangeKind = "up" | "down" | "flat" | "new" | "no_change";
export type PeriodGranularity = "day" | "week" | "month";

export interface DateRangeComparison {
  currentFrom: Date;
  currentTo: Date;
  prevFrom: Date;
  prevTo: Date;
  currentFromYmd: string;
  currentToYmd: string;
  prevFromYmd: string;
  prevToYmd: string;
  inclusiveDays: number;
  durationMs: number;
}

export interface ValueChange {
  current: number;
  previous: number;
  difference: number;
  percentChange: number | null;
  percentChangeLabel: string;
  kind: ChangeKind;
}

export interface PeriodBucket {
  key: string;
  label: string;
  from: Date;
  to: Date;
  fromYmd: string;
  toYmd: string;
}

export function isDashboardMetricId(value: string): value is (typeof DASHBOARD_METRICS)[number] {
  return (DASHBOARD_METRICS as readonly string[]).includes(value);
}

export function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1, 0, 0, 0, 0));
}

export function endOfYmd(ymd: string): Date {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1, 23, 59, 59, 999));
}

export function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function resolveComparisonRange(fromYmd: string, toYmdInput: string): DateRangeComparison {
  let from = fromYmd.slice(0, 10);
  let to = toYmdInput.slice(0, 10);
  if (!from || !to || from > to) {
    const end = toYmd(new Date());
    from = toYmd(addUtcDays(parseYmd(end), -30));
    to = end;
  }
  const currentFrom = parseYmd(from);
  const currentTo = endOfYmd(to);
  const durationMs = Math.max(DAY_MS - 1, currentTo.getTime() - currentFrom.getTime());
  const prevTo = new Date(currentFrom.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return {
    currentFrom,
    currentTo,
    prevFrom,
    prevTo,
    currentFromYmd: from,
    currentToYmd: to,
    prevFromYmd: toYmd(prevFrom),
    prevToYmd: toYmd(prevTo),
    inclusiveDays: Math.round((parseYmd(to).getTime() - currentFrom.getTime()) / DAY_MS) + 1,
    durationMs,
  };
}

export function resolveOverviewRange(query?: {
  days?: string;
  from?: string;
  to?: string;
}): DateRangeComparison {
  if (query?.from && query?.to) {
    return resolveComparisonRange(query.from, query.to);
  }
  const days = Math.max(1, parseInt(query?.days || "30", 10) || 30);
  const to = toYmd(new Date());
  const from = toYmd(addUtcDays(parseYmd(to), -days));
  return resolveComparisonRange(from, to);
}

function round1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function compareValues(current: number, previous: number): ValueChange {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;
  const difference = round2(safeCurrent - safePrevious);
  if (safePrevious === 0 && safeCurrent === 0) {
    return {
      current: safeCurrent,
      previous: safePrevious,
      difference: 0,
      percentChange: null,
      percentChangeLabel: "No change",
      kind: "no_change",
    };
  }
  if (safePrevious === 0) {
    return {
      current: safeCurrent,
      previous: safePrevious,
      difference,
      percentChange: null,
      percentChangeLabel: "New",
      kind: "new",
    };
  }
  const pct = round1(((safeCurrent - safePrevious) / safePrevious) * 100);
  const kind: ChangeKind = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const sign = pct > 0 ? "+" : "";
  return {
    current: safeCurrent,
    previous: safePrevious,
    difference,
    percentChange: pct,
    percentChangeLabel: `${sign}${pct.toFixed(1)}%`,
    kind,
  };
}

/** Percentage-point change for rates (32% vs 41% → -9.0 pp). */
export function comparePercentagePoints(current: number, previous: number): ValueChange {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;
  const difference = round1(safeCurrent - safePrevious);
  if (safePrevious === 0 && safeCurrent === 0) {
    return {
      current: safeCurrent,
      previous: safePrevious,
      difference: 0,
      percentChange: null,
      percentChangeLabel: "No change",
      kind: "no_change",
    };
  }
  if (safePrevious === 0) {
    return {
      current: safeCurrent,
      previous: safePrevious,
      difference,
      percentChange: null,
      percentChangeLabel: "New",
      kind: "new",
    };
  }
  const kind: ChangeKind = difference > 0 ? "up" : difference < 0 ? "down" : "flat";
  const sign = difference > 0 ? "+" : "";
  return {
    current: safeCurrent,
    previous: safePrevious,
    difference,
    percentChange: difference,
    percentChangeLabel: `${sign}${difference.toFixed(1)} pp`,
    kind,
  };
}

export function chartGranularity(inclusiveDays: number): PeriodGranularity {
  if (inclusiveDays <= 31) return "day";
  if (inclusiveDays <= 90) return "week";
  return "month";
}

export function tableGranularity(range: DateRangeComparison): PeriodGranularity {
  const from = parseYmd(range.currentFromYmd);
  const to = parseYmd(range.currentToYmd);
  const spansMonths =
    from.getUTCFullYear() !== to.getUTCFullYear() || from.getUTCMonth() !== to.getUTCMonth();
  if (spansMonths && range.inclusiveDays > 14) return "month";
  return chartGranularity(range.inclusiveDays);
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildPeriodBuckets(
  fromYmd: string,
  toYmdStr: string,
  granularity: PeriodGranularity,
): PeriodBucket[] {
  const start = parseYmd(fromYmd);
  const end = endOfYmd(toYmdStr);
  const buckets: PeriodBucket[] = [];

  if (granularity === "day") {
    let cursor = start;
    while (cursor.getTime() <= end.getTime()) {
      const ymd = toYmd(cursor);
      buckets.push({
        key: ymd,
        label: dayLabel(cursor),
        from: parseYmd(ymd),
        to: endOfYmd(ymd),
        fromYmd: ymd,
        toYmd: ymd,
      });
      cursor = addUtcDays(cursor, 1);
    }
    return buckets;
  }

  if (granularity === "week") {
    let cursor = start;
    while (cursor.getTime() <= end.getTime()) {
      const weekEndDay = addUtcDays(cursor, 6);
      const clippedEnd = weekEndDay.getTime() > end.getTime() ? end : endOfYmd(toYmd(weekEndDay));
      const fromKey = toYmd(cursor);
      const toKey = toYmd(clippedEnd);
      buckets.push({
        key: `${fromKey}_${toKey}`,
        label: `${dayLabel(cursor)} – ${dayLabel(clippedEnd)}`,
        from: parseYmd(fromKey),
        to: clippedEnd,
        fromYmd: fromKey,
        toYmd: toKey,
      });
      cursor = addUtcDays(cursor, 7);
    }
    return buckets;
  }

  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    const monthStart = cursor.getTime() < start.getTime() ? start : cursor;
    const rawMonthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const monthEnd = rawMonthEnd.getTime() > end.getTime() ? end : rawMonthEnd;
    const fromKey = toYmd(monthStart);
    const toKey = toYmd(monthEnd);
    buckets.push({
      key: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(cursor),
      from: parseYmd(fromKey),
      to: monthEnd,
      fromYmd: fromKey,
      toYmd: toKey,
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return buckets;
}

export function shiftRange(
  from: Date,
  to: Date,
  durationMs: number,
): { from: Date; to: Date } {
  return {
    from: new Date(from.getTime() - durationMs - 1),
    to: new Date(to.getTime() - durationMs - 1),
  };
}

export function inRange(date: Date, from: Date, to: Date): boolean {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

/** Align a current-period bucket to the equivalent previous-period window. */
export function alignPreviousBucket(
  bucket: Pick<PeriodBucket, "from" | "to">,
  range: DateRangeComparison,
): { from: Date; to: Date } {
  const delta = range.currentFrom.getTime() - range.prevFrom.getTime();
  return {
    from: new Date(bucket.from.getTime() - delta),
    to: new Date(bucket.to.getTime() - delta),
  };
}
