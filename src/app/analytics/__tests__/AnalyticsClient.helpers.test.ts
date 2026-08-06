import { buildCarbsInsulinSmallMultiplesData, buildInsulinCarbScatterData } from '../AnalyticsClient';

import { formatDateTimeDDMMYYYY } from '@/lib/date-utils';

// Mirrors the local-day bucketing formula used both server-side
// (summarizeDailyTotals) and client-side (buildCarbsInsulinSmallMultiplesData),
// so tests stay correct regardless of the machine's timezone.
function dayKey(timestamp: string): string {
  return new Date(new Date(timestamp).setHours(0, 0, 0, 0)).toISOString();
}

describe('buildInsulinCarbScatterData', () => {
  it('returns an empty array for no pairs', () => {
    expect(buildInsulinCarbScatterData([])).toEqual([]);
  });

  it('maps carbs/units and formats a time label for each pair', () => {
    const pairs = [
      { timestamp: '2024-01-01T12:05:00Z', units: 6, carbs: 4 },
      { timestamp: '2024-01-02T08:00:00Z', units: 3, carbs: 2.5 },
    ];

    const result = buildInsulinCarbScatterData(pairs);

    expect(result).toEqual([
      { carbs: 4, units: 6, label: formatDateTimeDDMMYYYY(pairs[0].timestamp) },
      { carbs: 2.5, units: 3, label: formatDateTimeDDMMYYYY(pairs[1].timestamp) },
    ]);
  });
});

describe('buildCarbsInsulinSmallMultiplesData', () => {
  it('returns an empty array when there is no carbs or insulin data', () => {
    expect(buildCarbsInsulinSmallMultiplesData([], [])).toEqual([]);
  });

  it('zero-fills insulin for a carbs-only day', () => {
    const carbsByDay = [{ date: dayKey('2024-01-01T12:00:00.000Z'), total: 5 }];

    const result = buildCarbsInsulinSmallMultiplesData(carbsByDay, []);

    expect(result).toEqual([{ date: dayKey('2024-01-01T12:00:00.000Z'), carbs: 5, insulinUnits: 0 }]);
  });

  it('zero-fills carbs for an insulin-only day', () => {
    const insulin = [{ timestamp: '2024-01-01T12:00:00.000Z', units: 6 }];

    const result = buildCarbsInsulinSmallMultiplesData([], insulin);

    expect(result).toEqual([{ date: dayKey(insulin[0].timestamp), carbs: 0, insulinUnits: 6 }]);
  });

  it('merges carbs and insulin totals on overlapping days and sorts chronologically', () => {
    // Same-day timestamps a few hours apart (matching the existing hydration-by-day
    // test convention elsewhere in this codebase); the other carbs-only day is
    // several days away so the two never collide regardless of local timezone.
    const sameDayA = '2024-01-01T10:00:00.000Z';
    const sameDayB = '2024-01-01T14:00:00.000Z';
    const carbsByDay = [
      { date: dayKey('2024-01-05T12:00:00.000Z'), total: 4 },
      { date: dayKey(sameDayA), total: 5 },
    ];
    const insulin = [
      { timestamp: sameDayA, units: 6 },
      { timestamp: sameDayB, units: 2 },
    ];

    const result = buildCarbsInsulinSmallMultiplesData(carbsByDay, insulin);

    expect(result).toEqual([
      { date: dayKey(sameDayA), carbs: 5, insulinUnits: 8 },
      { date: dayKey('2024-01-05T12:00:00.000Z'), carbs: 4, insulinUnits: 0 },
    ]);
  });
});
