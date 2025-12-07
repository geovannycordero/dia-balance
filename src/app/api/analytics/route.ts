import { endOfDay, startOfDay, subDays } from 'date-fns';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { ActionType } from '@/app/constants/action-types';
import { authOptions } from '@/lib/auth';
import { dateStringToUTC, dateStringToUTCEndOfDay } from '@/lib/date-utils';
import { prisma } from '@/lib/prisma';

import type { Action } from '@prisma/client';

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
    .filter((a: Action) => a.type === ActionType.BLOOD_GLUCOSE && a.bloodGlucose !== null)
    .map((a: Action) => ({
      timestamp: a.timestamp,
      value: a.bloodGlucose as number,
      context: a.glucoseContext ?? undefined,
    }));

  const insulin = actions
    .filter((a: Action) => a.type === ActionType.INSULIN && a.insulinUnits !== null)
    .map((a: Action) => ({
      timestamp: a.timestamp,
      units: a.insulinUnits as number,
      insulinType: a.insulinType ?? undefined,
    }));

  const exercise = actions
    .filter((a: Action) => a.type === ActionType.EXERCISE && a.exerciseDuration !== null)
    .map((a: Action) => ({
      timestamp: a.timestamp,
      type: a.exerciseType ?? undefined,
      duration: a.exerciseDuration as number,
      intensity: a.exerciseIntensity ?? undefined,
    }));

  const sleep = actions
    .filter((a: Action) => a.type === ActionType.SLEEP && a.sleepHours !== null)
    .map((a: Action) => ({
      timestamp: a.timestamp,
      hours: a.sleepHours as number,
      quality: a.sleepQuality ?? undefined,
    }));

  const weight = actions
    .filter((a: Action) => a.type === ActionType.WEIGHT && a.weightValue !== null)
    .map((a: Action) => ({
      timestamp: a.timestamp,
      value: a.weightValue as number,
      unit: a.weightUnit ?? undefined,
    }));

  const hydration = actions
    .filter((a: Action) => a.type === ActionType.HYDRATION && a.hydrationAmount !== null)
    .map((a: Action) => ({
      timestamp: a.timestamp,
      amount: a.hydrationAmount as number,
    }));

  const bloodPressure = actions
    .filter(
      (a: Action) =>
        a.type === ActionType.BLOOD_PRESSURE &&
        a.bloodPressureSystolic !== null &&
        a.bloodPressureDiastolic !== null,
    )
    .map((a: Action) => ({
      timestamp: a.timestamp,
      systolic: a.bloodPressureSystolic as number,
      diastolic: a.bloodPressureDiastolic as number,
      category: getBloodPressureCategory(
        a.bloodPressureSystolic as number,
        a.bloodPressureDiastolic as number,
      ),
    }));

  const medication = actions.filter((a: Action) => a.type === ActionType.MEDICATION);

  const dailyGlucoseSummary = summarizeDailyGlucose(bloodGlucose);
  const dailyBloodPressureSummary = summarizeDailyBloodPressure(bloodPressure);
  const hydrationByDay = summarizeDailyTotals(
    hydration.map((h: { timestamp: Date; amount: number }) => ({
      timestamp: h.timestamp,
      value: h.amount,
    })),
  );
  const weightTrend = summarizeWeight(weight);

  const bpGlucoseCorrelation = calculateBPCorrelation(bloodPressure, bloodGlucose);

  const insights = buildInsights({
    bloodGlucose,
    insulin,
    exercise,
    sleep,
    weight,
    hydration,
    bloodPressure,
    medicationCount: medication.length,
    bpGlucoseCorrelation,
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
    bloodPressure,
    dailyGlucoseSummary,
    dailyBloodPressureSummary,
    hydrationByDay,
    weightTrend,
    bpGlucoseCorrelation,
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

function summarizeDailyBloodPressure(
  readings: { timestamp: Date; systolic: number; diastolic: number; category: string }[],
) {
  const byDay = new Map<
    string,
    {
      date: string;
      systolicCount: number;
      systolicSum: number;
      systolicMin: number;
      systolicMax: number;
      diastolicCount: number;
      diastolicSum: number;
      diastolicMin: number;
      diastolicMax: number;
    }
  >();

  readings.forEach((r) => {
    const key = startOfDay(r.timestamp).toISOString();
    const existing = byDay.get(key) ?? {
      date: key,
      systolicCount: 0,
      systolicSum: 0,
      systolicMin: r.systolic,
      systolicMax: r.systolic,
      diastolicCount: 0,
      diastolicSum: 0,
      diastolicMin: r.diastolic,
      diastolicMax: r.diastolic,
    };
    existing.systolicCount += 1;
    existing.systolicSum += r.systolic;
    existing.systolicMin = Math.min(existing.systolicMin, r.systolic);
    existing.systolicMax = Math.max(existing.systolicMax, r.systolic);
    existing.diastolicCount += 1;
    existing.diastolicSum += r.diastolic;
    existing.diastolicMin = Math.min(existing.diastolicMin, r.diastolic);
    existing.diastolicMax = Math.max(existing.diastolicMax, r.diastolic);
    byDay.set(key, existing);
  });

  return Array.from(byDay.values()).map((d) => ({
    date: d.date,
    systolicAvg: d.systolicCount ? d.systolicSum / d.systolicCount : 0,
    systolicMin: d.systolicMin,
    systolicMax: d.systolicMax,
    systolicCount: d.systolicCount,
    diastolicAvg: d.diastolicCount ? d.diastolicSum / d.diastolicCount : 0,
    diastolicMin: d.diastolicMin,
    diastolicMax: d.diastolicMax,
    diastolicCount: d.diastolicCount,
  }));
}

function getBloodPressureCategory(
  systolic: number,
  diastolic: number,
): 'normal' | 'elevated' | 'hypertension-stage-1' | 'hypertension-stage-2' | 'crisis' {
  if (systolic > 180 || diastolic > 120) {
    return 'crisis';
  }
  if (systolic >= 140 || diastolic >= 90) {
    return 'hypertension-stage-2';
  }
  if (systolic >= 130 || diastolic >= 80) {
    return 'hypertension-stage-1';
  }
  if (systolic >= 120) {
    return 'elevated';
  }
  return 'normal';
}

function calculateBPCorrelation(
  bpReadings: { timestamp: Date; systolic: number; diastolic: number }[],
  glucoseReadings: { timestamp: Date; value: number }[],
): { coefficient: number; strength: string; direction: string } | null {
  if (bpReadings.length === 0 || glucoseReadings.length === 0) {
    return null;
  }

  // Match BP and glucose readings within 30 minutes
  const matchedPairs: { bp: number; glucose: number }[] = [];

  bpReadings.forEach((bp) => {
    const bpTime = bp.timestamp.getTime();
    const matchingGlucose = glucoseReadings.find((g) => {
      const glucoseTime = g.timestamp.getTime();
      const diffMinutes = Math.abs(bpTime - glucoseTime) / (1000 * 60);
      return diffMinutes <= 30;
    });

    if (matchingGlucose) {
      matchedPairs.push({ bp: bp.systolic, glucose: matchingGlucose.value });
    }
  });

  if (matchedPairs.length < 3) {
    // Need at least 3 pairs for meaningful correlation
    return null;
  }

  // Calculate Pearson correlation coefficient
  const n = matchedPairs.length;
  const bpValues = matchedPairs.map((p) => p.bp);
  const glucoseValues = matchedPairs.map((p) => p.glucose);

  const bpMean = bpValues.reduce((sum, val) => sum + val, 0) / n;
  const glucoseMean = glucoseValues.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let bpVariance = 0;
  let glucoseVariance = 0;

  for (let i = 0; i < n; i++) {
    const bpDiff = bpValues[i] - bpMean;
    const glucoseDiff = glucoseValues[i] - glucoseMean;
    numerator += bpDiff * glucoseDiff;
    bpVariance += bpDiff * bpDiff;
    glucoseVariance += glucoseDiff * glucoseDiff;
  }

  const denominator = Math.sqrt(bpVariance * glucoseVariance);
  const coefficient = denominator === 0 ? 0 : numerator / denominator;

  // Determine strength
  const absCoeff = Math.abs(coefficient);
  let strength: string;
  if (absCoeff >= 0.7) {
    strength = 'strong';
  } else if (absCoeff >= 0.4) {
    strength = 'moderate';
  } else {
    strength = 'weak';
  }

  // Determine direction
  const direction = coefficient >= 0 ? 'positive' : 'negative';

  return {
    coefficient: Math.round(coefficient * 100) / 100, // Round to 2 decimal places
    strength,
    direction,
  };
}

type InsightContext = {
  bloodGlucose: { timestamp: Date; value: number; context?: string }[];
  insulin: { timestamp: Date; units: number; insulinType?: string }[];
  exercise: { timestamp: Date; type?: string; duration: number; intensity?: string }[];
  sleep: { timestamp: Date; hours: number; quality?: number | null }[];
  weight: { timestamp: Date; value: number; unit?: string | null }[];
  hydration: { timestamp: Date; amount: number }[];
  bloodPressure: { timestamp: Date; systolic: number; diastolic: number; category: string }[];
  medicationCount: number;
  bpGlucoseCorrelation: { coefficient: number; strength: string; direction: string } | null;
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

  if (ctx.bloodPressure.length > 0) {
    const avgSystolic =
      ctx.bloodPressure.reduce((sum, bp) => sum + bp.systolic, 0) / ctx.bloodPressure.length;
    const avgDiastolic =
      ctx.bloodPressure.reduce((sum, bp) => sum + bp.diastolic, 0) / ctx.bloodPressure.length;
    insights.push(
      `Your average blood pressure in this period is ${avgSystolic.toFixed(0)}/${avgDiastolic.toFixed(0)} mm Hg.`,
    );

    // Category distribution
    const categoryCounts = new Map<string, number>();
    ctx.bloodPressure.forEach((bp) => {
      categoryCounts.set(bp.category, (categoryCounts.get(bp.category) || 0) + 1);
    });

    const elevatedCount = categoryCounts.get('elevated') || 0;
    const stage1Count = categoryCounts.get('hypertension-stage-1') || 0;
    const stage2Count = categoryCounts.get('hypertension-stage-2') || 0;
    const crisisCount = categoryCounts.get('crisis') || 0;

    if (crisisCount > 0) {
      insights.push(
        `⚠️ ${crisisCount} reading${crisisCount > 1 ? 's' : ''} in hypertensive crisis range (>180/>120). Please consult your healthcare provider immediately.`,
      );
    } else if (stage2Count > 0) {
      insights.push(
        `${stage2Count} reading${stage2Count > 1 ? 's' : ''} in Hypertension Stage 2 range (≥140/≥90). Consider discussing with your healthcare provider.`,
      );
    } else if (stage1Count > 0) {
      insights.push(
        `${stage1Count} reading${stage1Count > 1 ? 's' : ''} in Hypertension Stage 1 range (130-139/80-89). Monitor closely.`,
      );
    } else if (elevatedCount > 0) {
      insights.push(
        `${elevatedCount} reading${elevatedCount > 1 ? 's' : ''} in elevated range (120-129/<80). Continue monitoring.`,
      );
    }
  }

  if (ctx.bpGlucoseCorrelation) {
    const { coefficient, strength, direction } = ctx.bpGlucoseCorrelation;
    const absCoeff = Math.abs(coefficient);
    if (absCoeff >= 0.4) {
      const interpretation =
        direction === 'positive'
          ? 'Higher blood glucose tends to coincide with higher blood pressure'
          : 'Higher blood glucose tends to coincide with lower blood pressure';
      insights.push(
        `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation (r=${coefficient.toFixed(2)}): ${interpretation}.`,
      );
    }
  }

  return insights;
}
