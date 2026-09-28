import { describe, expect, it } from 'vitest';
import { resolveComparisonRange } from '@doloyal/shared';
import { clampRangeToOnboarding } from './onboarding-range';

describe('clampRangeToOnboarding', () => {
  it('leaves ranges after onboarding untouched', () => {
    const range = resolveComparisonRange('2026-09-01', '2026-09-30');
    expect(clampRangeToOnboarding(range, new Date('2026-01-15T10:00:00Z'))).toBe(range);
    expect(clampRangeToOnboarding(range, null)).toBe(range);
  });

  it('starts the window on the onboarding day and empties the previous period', () => {
    const range = resolveComparisonRange('2026-08-29', '2026-09-28');
    const clamped = clampRangeToOnboarding(range, new Date('2026-09-20T15:30:00Z'));

    expect(clamped.currentFromYmd).toBe('2026-09-20');
    expect(clamped.currentFrom.toISOString()).toBe('2026-09-20T00:00:00.000Z');
    expect(clamped.currentToYmd).toBe('2026-09-28');
    expect(clamped.inclusiveDays).toBe(9);
    // Previous window lies before onboarding: prevFrom > prevTo matches nothing.
    expect(clamped.prevFrom.getTime()).toBeGreaterThan(clamped.prevTo.getTime());
  });

  it('trims a previous period that straddles onboarding', () => {
    const range = resolveComparisonRange('2026-09-21', '2026-09-28');
    const clamped = clampRangeToOnboarding(range, new Date('2026-09-18T08:00:00Z'));

    expect(clamped.currentFromYmd).toBe('2026-09-21');
    expect(clamped.prevFromYmd).toBe('2026-09-18');
    expect(clamped.prevTo).toEqual(range.prevTo);
  });

  it('collapses a window entirely before onboarding to the onboarding day', () => {
    const range = resolveComparisonRange('2026-01-01', '2026-01-31');
    const clamped = clampRangeToOnboarding(range, new Date('2026-03-05T00:00:00Z'));

    expect(clamped.currentFromYmd).toBe('2026-03-05');
    expect(clamped.currentToYmd).toBe('2026-03-05');
    expect(clamped.inclusiveDays).toBe(1);
  });
});
