'use client';

import { subDays } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import { ActionType } from '@/app/constants/action-types';
import { RangePreset } from '@/app/constants/range-presets';
import { Navigation } from '@/components/Navigation';
import {
  formatDateDDMMYYYY,
  formatDateTimeDDMMYYYY,
  localDateToUTCISO,
  localDateToUTCISOEndOfDay,
} from '@/lib/date-utils';
import { exportToPDF } from '@/lib/export';

import type { UserPreferences } from '@/lib/user-preferences';

type AnalyticsResponse = {
  range: {
    from: string;
    to: string;
  };
  bloodGlucose: { timestamp: string; value: number; context?: string }[];
  insulin: { timestamp: string; units: number; insulinType?: string }[];
  exercise: { timestamp: string; type?: string; duration: number; intensity?: string }[];
  sleep: { timestamp: string; hours: number; quality?: number | null }[];
  weight: { timestamp: string; value: number; unit?: string | null }[];
  hydration: { timestamp: string; amount: number }[];
  bloodPressure: {
    timestamp: string;
    systolic: number;
    diastolic: number;
    category: string;
  }[];
  dailyGlucoseSummary: { date: string; avg: number; min: number; max: number; count: number }[];
  dailyBloodPressureSummary: {
    date: string;
    systolicAvg: number;
    systolicMin: number;
    systolicMax: number;
    systolicCount: number;
    diastolicAvg: number;
    diastolicMin: number;
    diastolicMax: number;
    diastolicCount: number;
  }[];
  hydrationByDay: { date: string; total: number }[];
  weightTrend: { timestamp: string; value: number; unit?: string | null }[];
  bpGlucoseCorrelation: { coefficient: number; strength: string; direction: string } | null;
  insights: string[];
};

type AnalyticsClientProps = {
  userPreferences: UserPreferences;
};

export function AnalyticsClient({ userPreferences }: AnalyticsClientProps) {
  const [preset, setPreset] = useState<RangePreset>(RangePreset.TODAY);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range from preset
  // Convert local dates to UTC ISO strings before sending to API
  const dateRange = useMemo(() => {
    if (from && to) {
      // Custom dates: convert YYYY-MM-DD to UTC ISO strings
      return {
        from: localDateToUTCISO(from),
        to: localDateToUTCISOEndOfDay(to),
      };
    }

    // For presets, calculate dates in local timezone, then convert to UTC ISO strings
    const today = new Date();
    const todayStr = formatLocalDate(today);

    if (preset === RangePreset.TODAY) {
      return {
        from: localDateToUTCISO(todayStr),
        to: localDateToUTCISOEndOfDay(todayStr),
      };
    }

    if (preset === RangePreset.YESTERDAY) {
      const yesterday = subDays(today, 1);
      const yesterdayStr = formatLocalDate(yesterday);
      return {
        from: localDateToUTCISO(yesterdayStr),
        to: localDateToUTCISOEndOfDay(yesterdayStr),
      };
    }

    const daysAgo =
      preset === RangePreset.LAST_7_DAYS ? 7 : preset === RangePreset.LAST_14_DAYS ? 14 : 30;
    const startDate = subDays(today, daysAgo);
    const startDateStr = formatLocalDate(startDate);
    return {
      from: localDateToUTCISO(startDateStr),
      to: localDateToUTCISOEndOfDay(todayStr),
    };
  }, [preset, from, to]);

  // Helper to format date as YYYY-MM-DD in local timezone
  function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, from, to]);

  async function fetchData() {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('from', dateRange.from);
      params.set('to', dateRange.to);

      const res = await fetch(`/api/analytics?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load analytics');
      }

      const json = (await res.json()) as AnalyticsResponse;
      setData({
        ...json,
        range: {
          from: json.range.from,
          to: json.range.to,
        },
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }

  const csvBlob = useMemo(() => {
    if (!data) return null;

    const rows: string[] = [];
    rows.push(
      'type,timestamp,bloodGlucose,insulinUnits,insulinType,exerciseType,exerciseDuration,exerciseIntensity,sleepHours,sleepQuality,weightValue,weightUnit,hydrationAmount,bloodPressureSystolic,bloodPressureDiastolic',
    );

    data.bloodGlucose.forEach((r) => {
      rows.push(
        [
          ActionType.BLOOD_GLUCOSE,
          r.timestamp,
          r.value,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(','),
      );
    });

    data.insulin.forEach((r) => {
      rows.push(
        [
          ActionType.INSULIN,
          r.timestamp,
          '',
          r.units,
          r.insulinType ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(','),
      );
    });

    data.exercise.forEach((r) => {
      rows.push(
        [
          ActionType.EXERCISE,
          r.timestamp,
          '',
          '',
          '',
          r.type ?? '',
          r.duration,
          r.intensity ?? '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(','),
      );
    });

    data.sleep.forEach((r) => {
      rows.push(
        [
          ActionType.SLEEP,
          r.timestamp,
          '',
          '',
          '',
          '',
          '',
          '',
          r.hours,
          r.quality ?? '',
          '',
          '',
          '',
          '',
          '',
        ].join(','),
      );
    });

    data.weightTrend.forEach((r) => {
      rows.push(
        [
          ActionType.WEIGHT,
          r.timestamp,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          r.value,
          r.unit ?? '',
          '',
          '',
          '',
        ].join(','),
      );
    });

    data.hydration.forEach((r) => {
      rows.push(
        [
          ActionType.HYDRATION,
          r.timestamp,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          r.amount,
          '',
          '',
        ].join(','),
      );
    });

    data.bloodPressure.forEach((r) => {
      rows.push(
        [
          ActionType.BLOOD_PRESSURE,
          r.timestamp,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          r.systolic,
          r.diastolic,
        ].join(','),
      );
    });

    return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  }, [data]);

  const handleDownloadCsv = () => {
    if (!csvBlob) return;
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dia-balance-analytics.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const presetLabel = useMemo(() => {
    if (from && to) {
      // Format dates as dd/mm/YYYY
      const fromDate = new Date(from);
      const toDate = new Date(to);
      return `${formatDateDDMMYYYY(fromDate)} to ${formatDateDDMMYYYY(toDate)}`;
    }
    switch (preset) {
      case RangePreset.TODAY:
        return 'Today';
      case RangePreset.YESTERDAY:
        return 'Yesterday';
      case RangePreset.LAST_7_DAYS:
        return 'Last 7 days';
      case RangePreset.LAST_14_DAYS:
        return 'Last 14 days';
      case RangePreset.LAST_30_DAYS:
        return 'Last 30 days';
      default:
        return '';
    }
  }, [preset, from, to]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                Dia Balance
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Analytics & insights
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Trends and relationships across glucose, insulin, activity, sleep, weight,
                hydration, and blood pressure.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-700 dark:text-slate-300">Range:</label>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none ring-sky-500/60 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={preset}
                  onChange={(e) => {
                    const value = e.target.value as RangePreset;
                    setPreset(value);
                    setFrom(null);
                    setTo(null);
                  }}
                >
                  <option value={RangePreset.TODAY}>Today</option>
                  <option value={RangePreset.YESTERDAY}>Yesterday</option>
                  <option value={RangePreset.LAST_7_DAYS}>Last 7 days</option>
                  <option value={RangePreset.LAST_14_DAYS}>Last 14 days</option>
                  <option value={RangePreset.LAST_30_DAYS}>Last 30 days</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-500">or custom:</span>
                <input
                  type="date"
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none ring-sky-500/60 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={from ?? ''}
                  onChange={(e) => setFrom(e.target.value || null)}
                />
                <span className="text-xs text-slate-600 dark:text-slate-500">to</span>
                <input
                  type="date"
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none ring-sky-500/60 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={to ?? ''}
                  onChange={(e) => setTo(e.target.value || null)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={!csvBlob}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => data && exportToPDF(data)}
                  disabled={!data}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  PDF
                </button>
              </div>
            </div>
          </header>

          {isLoading && (
            <div className="space-y-4">
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Loading analytics for {presetLabel}…
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="mb-2 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-[220px] animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          {data && (
            <div className="flex flex-col gap-6">
              {/* Glucose Charts */}
              {(userPreferences.enabledAnalytics.bloodGlucoseTrend ||
                userPreferences.enabledAnalytics.dailyGlucoseSummary) && (
                <section
                  className={`grid gap-4 ${
                    userPreferences.enabledAnalytics.bloodGlucoseTrend &&
                    userPreferences.enabledAnalytics.dailyGlucoseSummary
                      ? 'md:grid-cols-2'
                      : 'md:grid-cols-1'
                  }`}
                >
                  {userPreferences.enabledAnalytics.bloodGlucoseTrend && (
                    <AnalyticsCard title="Blood glucose trend">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={data.bloodGlucose.map((p) => ({
                            time: formatDateTimeDDMMYYYY(p.timestamp),
                            value: p.value,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="mg/dL"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </AnalyticsCard>
                  )}

                  {userPreferences.enabledAnalytics.dailyGlucoseSummary && (
                    <AnalyticsCard title="Daily glucose summary">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={data.dailyGlucoseSummary.map((d) => ({
                            date: formatDateDDMMYYYY(d.date),
                            avg: d.avg,
                            min: d.min,
                            max: d.max,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="min"
                            stroke="#22c55e"
                            strokeWidth={1.5}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="avg"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="max"
                            stroke="#f97316"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </AnalyticsCard>
                  )}
                </section>
              )}

              {/* Insulin & Hydration Charts */}
              {(userPreferences.enabledAnalytics.insulinVsGlucose ||
                userPreferences.enabledAnalytics.exerciseHydration) && (
                <section
                  className={`grid gap-4 ${
                    userPreferences.enabledAnalytics.insulinVsGlucose &&
                    userPreferences.enabledAnalytics.exerciseHydration
                      ? 'md:grid-cols-2'
                      : 'md:grid-cols-1'
                  }`}
                >
                  {userPreferences.enabledAnalytics.insulinVsGlucose && (
                    <AnalyticsCard title="Insulin vs glucose">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={mergeSeriesForDualAxis(
                            data.insulin.map((p) => ({
                              time: new Date(p.timestamp).toISOString(),
                              insulinUnits: p.units,
                            })),
                            data.bloodGlucose.map((p) => ({
                              time: new Date(p.timestamp).toISOString(),
                              glucose: p.value,
                            })),
                          )}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 10 }}
                            label={{ value: 'mg/dL', angle: -90, position: 'insideLeft' }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 10 }}
                            label={{ value: 'Units', angle: 90, position: 'insideRight' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="glucose"
                            name="Glucose (mg/dL)"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="insulinUnits"
                            name="Insulin (units)"
                            stroke="#a855f7"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </AnalyticsCard>
                  )}

                  {userPreferences.enabledAnalytics.exerciseHydration && (
                    <AnalyticsCard title="Exercise impact & hydration">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={data.hydrationByDay.map((d) => ({
                            date: formatDateDDMMYYYY(d.date),
                            hydration: d.total,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="hydration"
                            name="Hydration (total)"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </AnalyticsCard>
                  )}
                </section>
              )}

              {/* Sleep & Weight Charts */}
              {(userPreferences.enabledAnalytics.sleepGlucose ||
                userPreferences.enabledAnalytics.weightTrend) && (
                <section
                  className={`grid gap-4 ${
                    userPreferences.enabledAnalytics.sleepGlucose &&
                    userPreferences.enabledAnalytics.weightTrend
                      ? 'md:grid-cols-2'
                      : 'md:grid-cols-1'
                  }`}
                >
                  {userPreferences.enabledAnalytics.sleepGlucose && (
                    <AnalyticsCard title="Sleep & glucose stability">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={data.sleep.map((s) => ({
                            date: formatDateDDMMYYYY(s.timestamp),
                            hours: s.hours,
                            quality: s.quality ?? undefined,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="hours"
                            name="Hours slept"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="quality"
                            name="Quality (1-5)"
                            stroke="#f97316"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </AnalyticsCard>
                  )}

                  {userPreferences.enabledAnalytics.weightTrend && (
                    <AnalyticsCard title="Weight trend">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={data.weightTrend.map((w) => ({
                            time: formatDateDDMMYYYY(w.timestamp),
                            value: w.value,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Weight"
                            stroke="#e5e7eb"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </AnalyticsCard>
                  )}
                </section>
              )}

              {/* Blood Pressure Charts */}
              {data.bloodPressure.length > 0 &&
                (userPreferences.enabledAnalytics.bloodPressureTrend ||
                  userPreferences.enabledAnalytics.dailyBloodPressureSummary) && (
                  <section
                    className={`grid gap-4 ${
                      userPreferences.enabledAnalytics.bloodPressureTrend &&
                      userPreferences.enabledAnalytics.dailyBloodPressureSummary
                        ? 'md:grid-cols-2'
                        : 'md:grid-cols-1'
                    }`}
                  >
                    {userPreferences.enabledAnalytics.bloodPressureTrend && (
                      <AnalyticsCard title="Blood pressure trend">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart
                            data={data.bloodPressure.map((p) => ({
                              time: formatDateTimeDDMMYYYY(p.timestamp),
                              systolic: p.systolic,
                              diastolic: p.diastolic,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="systolic"
                              name="Systolic (mm Hg)"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="diastolic"
                              name="Diastolic (mm Hg)"
                              stroke="#f97316"
                              strokeWidth={2}
                              dot={false}
                            />
                            {/* Reference lines for normal BP */}
                            <Line
                              type="monotone"
                              dataKey={() => 120}
                              name="Normal systolic"
                              stroke="#22c55e"
                              strokeWidth={1}
                              strokeDasharray="5 5"
                              dot={false}
                              legendType="none"
                            />
                            <Line
                              type="monotone"
                              dataKey={() => 80}
                              name="Normal diastolic"
                              stroke="#22c55e"
                              strokeWidth={1}
                              strokeDasharray="5 5"
                              dot={false}
                              legendType="none"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </AnalyticsCard>
                    )}

                    {userPreferences.enabledAnalytics.dailyBloodPressureSummary && (
                      <AnalyticsCard title="Daily blood pressure summary">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart
                            data={data.dailyBloodPressureSummary.map((d) => ({
                              date: formatDateDDMMYYYY(d.date),
                              systolicAvg: d.systolicAvg,
                              systolicMin: d.systolicMin,
                              systolicMax: d.systolicMax,
                              diastolicAvg: d.diastolicAvg,
                              diastolicMin: d.diastolicMin,
                              diastolicMax: d.diastolicMax,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="systolicMin"
                              stroke="#ef4444"
                              strokeWidth={1.5}
                              dot={false}
                              name="Systolic min"
                            />
                            <Line
                              type="monotone"
                              dataKey="systolicAvg"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={false}
                              name="Systolic avg"
                            />
                            <Line
                              type="monotone"
                              dataKey="systolicMax"
                              stroke="#ef4444"
                              strokeWidth={1.5}
                              dot={false}
                              name="Systolic max"
                            />
                            <Line
                              type="monotone"
                              dataKey="diastolicMin"
                              stroke="#f97316"
                              strokeWidth={1.5}
                              dot={false}
                              name="Diastolic min"
                            />
                            <Line
                              type="monotone"
                              dataKey="diastolicAvg"
                              stroke="#f97316"
                              strokeWidth={2}
                              dot={false}
                              name="Diastolic avg"
                            />
                            <Line
                              type="monotone"
                              dataKey="diastolicMax"
                              stroke="#f97316"
                              strokeWidth={1.5}
                              dot={false}
                              name="Diastolic max"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </AnalyticsCard>
                    )}
                  </section>
                )}

              {/* BP vs Glucose & Correlation Charts */}
              {data.bloodPressure.length > 0 &&
                data.bloodGlucose.length > 0 &&
                (userPreferences.enabledAnalytics.bpVsGlucose ||
                  userPreferences.enabledAnalytics.correlationAnalysis) && (
                  <section
                    className={`grid gap-4 ${
                      userPreferences.enabledAnalytics.bpVsGlucose &&
                      userPreferences.enabledAnalytics.correlationAnalysis &&
                      data.bpGlucoseCorrelation
                        ? 'md:grid-cols-2'
                        : 'md:grid-cols-1'
                    }`}
                  >
                    {userPreferences.enabledAnalytics.bpVsGlucose && (
                      <AnalyticsCard title="Blood pressure vs glucose">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart
                            data={mergeSeriesForDualAxisBP(
                              data.bloodPressure.map((p) => ({
                                time: new Date(p.timestamp).toISOString(),
                                systolic: p.systolic,
                              })),
                              data.bloodGlucose.map((p) => ({
                                time: new Date(p.timestamp).toISOString(),
                                glucose: p.value,
                              })),
                            )}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              yAxisId="left"
                              tick={{ fontSize: 10 }}
                              label={{ value: 'mm Hg', angle: -90, position: 'insideLeft' }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 10 }}
                              label={{ value: 'mg/dL', angle: 90, position: 'insideRight' }}
                            />
                            <Tooltip />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="systolic"
                              name="Systolic BP (mm Hg)"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="glucose"
                              name="Glucose (mg/dL)"
                              stroke="#38bdf8"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </AnalyticsCard>
                    )}

                    {data.bpGlucoseCorrelation &&
                      userPreferences.enabledAnalytics.correlationAnalysis && (
                        <AnalyticsCard title="Correlation analysis">
                          <div className="flex h-[220px] flex-col justify-center gap-3">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                r = {data.bpGlucoseCorrelation.coefficient.toFixed(2)}
                              </p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                Pearson correlation coefficient
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {data.bpGlucoseCorrelation.strength.charAt(0).toUpperCase() +
                                  data.bpGlucoseCorrelation.strength.slice(1)}{' '}
                                {data.bpGlucoseCorrelation.direction} correlation
                              </p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                {data.bpGlucoseCorrelation.direction === 'positive'
                                  ? 'Higher glucose tends to coincide with higher BP'
                                  : 'Higher glucose tends to coincide with lower BP'}
                              </p>
                            </div>
                            <div className="mt-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                <strong>Interpretation:</strong> Correlation strength is considered{' '}
                                <strong>weak</strong> if |r| &lt; 0.4, <strong>moderate</strong> if
                                0.4 ≤ |r| &lt; 0.7, and <strong>strong</strong> if |r| ≥ 0.7.
                              </p>
                            </div>
                          </div>
                        </AnalyticsCard>
                      )}
                  </section>
                )}

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Insights
                </h2>
                {data.insights.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Not enough data yet to surface meaningful insights. Keep logging for more
                    detailed feedback.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                    {data.insights.map((insight, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-0.5 text-sky-600 dark:text-sky-400">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

type DualSeriesPoint = {
  time: string;
  label: string;
  insulinUnits?: number;
  glucose?: number;
};

function mergeSeriesForDualAxis(
  insulin: { time: string; insulinUnits: number }[],
  glucose: { time: string; glucose: number }[],
): DualSeriesPoint[] {
  const byTime = new Map<string, DualSeriesPoint>();

  // First, add all insulin points
  insulin.forEach((p) => {
    const label = formatDateTimeDDMMYYYY(p.time);
    byTime.set(p.time, {
      time: p.time,
      label,
      insulinUnits: p.insulinUnits,
    });
  });

  // Then, add glucose points (merge with existing or create new)
  glucose.forEach((p) => {
    const label = formatDateTimeDDMMYYYY(p.time);
    const existing = byTime.get(p.time);
    if (existing) {
      existing.glucose = p.glucose;
    } else {
      byTime.set(p.time, {
        time: p.time,
        label,
        glucose: p.glucose,
      });
    }
  });

  // Sort by time
  return Array.from(byTime.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

function mergeSeriesForDualAxisBP(
  bp: { time: string; systolic: number }[],
  glucose: { time: string; glucose: number }[],
): DualSeriesPointBP[] {
  const byTime = new Map<string, DualSeriesPointBP>();

  // First, add all BP points
  bp.forEach((p) => {
    const label = formatDateTimeDDMMYYYY(p.time);
    byTime.set(p.time, {
      time: p.time,
      label,
      systolic: p.systolic,
      glucose: null,
    });
  });

  // Then, add glucose points (merge with existing or create new)
  glucose.forEach((p) => {
    const label = formatDateTimeDDMMYYYY(p.time);
    const existing = byTime.get(p.time);
    if (existing) {
      existing.glucose = p.glucose;
    } else {
      byTime.set(p.time, {
        time: p.time,
        label,
        systolic: null,
        glucose: p.glucose,
      });
    }
  });

  // Sort by time
  return Array.from(byTime.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}

type DualSeriesPointBP = {
  time: string;
  label: string;
  systolic: number | null;
  glucose: number | null;
};

type AnalyticsCardProps = {
  title: string;
  children: React.ReactNode;
};

function AnalyticsCard({ title, children }: AnalyticsCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {children}
    </section>
  );
}
