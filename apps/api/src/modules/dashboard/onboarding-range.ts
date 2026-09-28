import { parseYmd, toYmd, type DateRangeComparison } from '@doloyal/shared';

/**
 * Dashboard figures start on the day the business onboarded. Nothing before
 * that day counts — neither in the selected window nor in the "previous
 * period" it is compared with (a window that lies entirely before onboarding
 * becomes empty, so growth shows as "New" instead of a misleading -100%).
 */
export function clampRangeToOnboarding(
  range: DateRangeComparison,
  onboardedAt: Date | null | undefined,
): DateRangeComparison {
  if (!onboardedAt || Number.isNaN(onboardedAt.getTime())) return range;
  const floorYmd = toYmd(onboardedAt);
  const floor = parseYmd(floorYmd);
  if (range.currentFrom >= floor && range.prevFrom >= floor) return range;

  const next = { ...range };
  if (next.currentFrom < floor) {
    next.currentFrom = floor;
    next.currentFromYmd = floorYmd;
    // A window that ends before onboarding collapses to the onboarding day.
    if (next.currentTo < floor) {
      next.currentTo = new Date(floor.getTime() + 86_400_000 - 1);
      next.currentToYmd = floorYmd;
    }
    next.inclusiveDays =
      Math.round((parseYmd(next.currentToYmd).getTime() - floor.getTime()) / 86_400_000) + 1;
  }
  if (next.prevFrom < floor) {
    // prevFrom > prevTo when the whole previous window predates onboarding,
    // which matches no rows.
    next.prevFrom = floor;
    next.prevFromYmd = floorYmd;
  }
  return next;
}
