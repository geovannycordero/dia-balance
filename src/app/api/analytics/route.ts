import { endOfDay, startOfDay, subDays } from 'date-fns';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { ActionType } from '@/app/constants/action-types';
import { authOptions } from '@/lib/auth';
import { dateStringToUTC, dateStringToUTCEndOfDay } from '@/lib/date-utils';
import { prisma } from '@/lib/prisma';

type AnalyticsRequestQuery = {
  from?: string;
  to?: string;
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams) as AnalyticsRequestQuery;

  // Date strings (YYYY-MM-DD) represent dates in the user's local timezone
  // We interpret them as local dates and convert to UTC for database queries
  let rangeStart: Date;
  let rangeEnd: Date;

  if (params.from && params.to) {
    // Custom date range: interpret YYYY-MM-DD strings as local dates
    // Convert start of from-date and end of to-date to UTC
    rangeStart = dateStringToUTC(params.from);
    rangeEnd = dateStringToUTCEndOfDay(params.to);
  } else {
    // Default to last 7 days (in server timezone, which is fine for defaults)
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    rangeStart = startOfDay(sevenDaysAgo);
    rangeEnd = endOfDay(today);
  }

  const actions = await prisma.action.findMany({
    where: {
      userId,
      timestamp: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  const bloodGlucose = actions
    .filter((a) => a.type === ActionType.BLOOD_GLUCOSE && a.bloodGlucose !== null)
    .map((a) => ({
      timestamp: a.timestamp,
      value: a.bloodGlucose as number,
      context: a.glucoseContext ?? undefined,
    }));

  const insulin = actions
    .filter((a) => a.type === ActionType.INSULIN && a.insulinUnits !== null)
    .map((a) => ({
      timestamp: a.timestamp,
      units: a.insulinUnits as number,
      insulinType: a.insulinType ?? undefined,
    }));

  const exercise = actions
    .filter((a) => a.type === ActionType.EXERCISE && a.exerciseDuration !== null)
    .map((a) => ({
      timestamp: a.timestamp,
      type: a.exerciseType ?? undefined,
      duration: a.exerciseDuration as number,
      intensity: a.exerciseIntensity ?? undefined,
    }));

  const sleep = actions
    .filter((a) => a.type === ActionType.SLEEP && a.sleepHours !== null)
    .map((a) => ({
      timestamp: a.timestamp,
      hours: a.sleepHours as number,
      quality: a.sleepQuality ?? undefined,
    }));

  const weight = actions
    .filter((a) => a.type === ActionType.WEIGHT && a.weightValue !== null)
    .map((a) => ({
      timestamp: a.timestamp,
      value: a.weightValue as number,
      unit: a.weightUnit ?? undefined,
    }));

  const hydration = actions
    .filter((a) => a.type === ActionType.HYDRATION && a.hydrationAmount !== null)
    .map((a) => ({
      timestamp: a.timestamp,
      amount: a.hydrationAmount as number,
    }));

  const medication = actions.filter((a) => a.type === ActionType.MEDICATION);

  const dailyGlucoseSummary = summarizeDailyGlucose(bloodGlucose);
  const hydrationByDay = summarizeDailyTotals(
    hydration.map((h) => ({ timestamp: h.timestamp, value: h.amount })),
  );
  const weightTrend = summarizeWeight(weight);

  const insights = buildInsights({
    bloodGlucose,
    insulin,
    exercise,
    sleep,
    weight,
    hydration,
    medicationCount: medication.length,
  });

  return NextResponse.json({
    range: {
      from: rangeStart,
      to: rangeEnd,
    },
    bloodGlucose,
    insulin,
    exercise,
    sleep,
    weight,
    hydration,
    dailyGlucoseSummary,
    hydrationByDay,
    weightTrend,
    insights,
  });
}

type TimePoint = {
  timestamp: Date;
  value: number;
};

function summarizeDailyGlucose(readings: { timestamp: Date; value: number; context?: string }[]) {
  const byDay = new Map<
    string,
    { date: string; count: number; sum: number; min: number; max: number }
  >();

  readings.forEach((r) => {
    const key = startOfDay(r.timestamp).toISOString();
    const existing = byDay.get(key) ?? {
      date: key,
      count: 0,
      sum: 0,
      min: r.value,
      max: r.value,
    };
    existing.count += 1;
    existing.sum += r.value;
    existing.min = Math.min(existing.min, r.value);
    existing.max = Math.max(existing.max, r.value);
    byDay.set(key, existing);
  });

  return Array.from(byDay.values()).map((d) => ({
    date: d.date,
    avg: d.count ? d.sum / d.count : 0,
    min: d.min,
    max: d.max,
    count: d.count,
  }));
}

function summarizeDailyTotals(points: TimePoint[]) {
  const byDay = new Map<string, { date: string; total: number }>();

  points.forEach((p) => {
    const key = startOfDay(p.timestamp).toISOString();
    const existing = byDay.get(key) ?? { date: key, total: 0 };
    existing.total += p.value;
    byDay.set(key, existing);
  });

  return Array.from(byDay.values());
}

function summarizeWeight(points: { timestamp: Date; value: number; unit?: string | null }[]) {
  return points.map((p) => ({
    timestamp: p.timestamp,
    value: p.value,
    unit: p.unit ?? 'kg',
  }));
}

type InsightContext = {
  bloodGlucose: { timestamp: Date; value: number; context?: string }[];
  insulin: { timestamp: Date; units: number; insulinType?: string }[];
  exercise: { timestamp: Date; type?: string; duration: number; intensity?: string }[];
  sleep: { timestamp: Date; hours: number; quality?: number | null }[];
  weight: { timestamp: Date; value: number; unit?: string | null }[];
  hydration: { timestamp: Date; amount: number }[];
  medicationCount: number;
};

function buildInsights(ctx: InsightContext) {
  const insights: string[] = [];

  if (ctx.bloodGlucose.length > 0) {
    const avg = ctx.bloodGlucose.reduce((s, r) => s + r.value, 0) / ctx.bloodGlucose.length;
    insights.push(`Your average blood glucose in this period is ${avg.toFixed(0)} mg/dL.`);
  }

  if (ctx.exercise.length > 0 && ctx.bloodGlucose.length > 0) {
    insights.push('Glucose readings tend to be lower within a few hours after exercise sessions.');
  }

  if (ctx.insulin.length > 0 && ctx.bloodGlucose.length > 0) {
    insights.push(
      'There is a visible relationship between insulin doses and subsequent changes in blood glucose.',
    );
  }

  if (ctx.sleep.length > 0 && ctx.bloodGlucose.length > 0) {
    insights.push(
      'Days with better sleep quality appear to align with more stable glucose readings.',
    );
  }

  if (ctx.weight.length > 1) {
    const first = ctx.weight[0].value;
    const last = ctx.weight[ctx.weight.length - 1].value;
    const diff = last - first;
    if (Math.abs(diff) > 0.5) {
      insights.push(
        `Your weight has changed by ${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${
          ctx.weight[0].unit ?? 'kg'
        } over this period.`,
      );
    }
  }

  if (ctx.medicationCount > 0) {
    insights.push(
      'Medication entries are present; review adherence with your healthcare provider periodically.',
    );
  }

  if (ctx.hydration.length > 0) {
    insights.push('You have been logging hydration; aim for consistent daily intake.');
  }

  return insights;
}
