import { buildCarbsInsulinSmallMultiplesData, buildInsulinCarbScatterData } from '../AnalyticsClient';

import { formatDateTimeDDMMYYYY } from '@/lib/date-utils';

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
    const carbsByDay = [{ date: '2024-01-01T00:00:00.000Z', total: 5 }];

    const result = buildCarbsInsulinSmallMultiplesData(carbsByDay, []);

    expect(result).toEqual([{ date: '2024-01-01T00:00:00.000Z', carbs: 5, insulinUnits: 0 }]);
  });

  it('zero-fills carbs for an insulin-only day', () => {
    const insulinByDay = [{ date: '2024-01-01T00:00:00.000Z', total: 6 }];

    const result = buildCarbsInsulinSmallMultiplesData([], insulinByDay);

    expect(result).toEqual([{ date: '2024-01-01T00:00:00.000Z', carbs: 0, insulinUnits: 6 }]);
  });

  it('merges carbs and insulin totals on days that appear in both inputs, matching purely by the date key', () => {
    const carbsByDay = [
      { date: '2024-01-01T00:00:00.000Z', total: 5 },
      { date: '2024-01-05T00:00:00.000Z', total: 4 },
    ];
    const insulinByDay = [{ date: '2024-01-01T00:00:00.000Z', total: 8 }];

    const result = buildCarbsInsulinSmallMultiplesData(carbsByDay, insulinByDay);

    expect(result).toEqual([
      { date: '2024-01-01T00:00:00.000Z', carbs: 5, insulinUnits: 8 },
      { date: '2024-01-05T00:00:00.000Z', carbs: 4, insulinUnits: 0 },
    ]);
  });

  it('sorts the merged result chronologically regardless of input order', () => {
    const carbsByDay = [
      { date: '2024-01-05T00:00:00.000Z', total: 4 },
      { date: '2024-01-01T00:00:00.000Z', total: 5 },
    ];
    const insulinByDay = [{ date: '2024-01-03T00:00:00.000Z', total: 6 }];

    const result = buildCarbsInsulinSmallMultiplesData(carbsByDay, insulinByDay);

    expect(result.map((d) => d.date)).toEqual([
      '2024-01-01T00:00:00.000Z',
      '2024-01-03T00:00:00.000Z',
      '2024-01-05T00:00:00.000Z',
    ]);
  });
});
