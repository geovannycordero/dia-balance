import { z } from 'zod';

import { ActionType } from '@/app/constants/action-types';

export const EnabledAnalyticsSchema = z.object({
  glucoseOverview: z.boolean(),
  bloodGlucoseTrend: z.boolean(),
  agpChart: z.boolean(),
  glucosePatterns: z.boolean(),
  dailyGlucoseSummary: z.boolean(),
  insulinVsGlucose: z.boolean(),
  exerciseHydration: z.boolean(),
  sleepGlucose: z.boolean(),
  weightTrend: z.boolean(),
  bloodPressureTrend: z.boolean(),
  dailyBloodPressureSummary: z.boolean(),
  bpVsGlucose: z.boolean(),
  correlationAnalysis: z.boolean(),
});

const ActionTypeEnumSchema = z.enum([
  ActionType.BLOOD_GLUCOSE,
  ActionType.INSULIN,
  ActionType.MEDICATION,
  ActionType.FOOD,
  ActionType.EXERCISE,
  ActionType.SLEEP,
  ActionType.SYMPTOMS,
  ActionType.WEIGHT,
  ActionType.HYDRATION,
  ActionType.BLOOD_PRESSURE,
]);

export const UserPreferencesSchema = z.object({
  enabledActionTypes: z.array(ActionTypeEnumSchema),
  enabledAnalytics: EnabledAnalyticsSchema,
});

export type EnabledAnalytics = z.infer<typeof EnabledAnalyticsSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const DEFAULT_PREFERENCES: UserPreferences = {
  enabledActionTypes: [
    ActionType.BLOOD_GLUCOSE,
    ActionType.INSULIN,
    ActionType.FOOD,
    ActionType.EXERCISE,
    ActionType.MEDICATION,
    ActionType.BLOOD_PRESSURE,
  ],
  enabledAnalytics: {
    glucoseOverview: true,
    bloodGlucoseTrend: true,
    agpChart: true,
    glucosePatterns: true,
    dailyGlucoseSummary: true,
    insulinVsGlucose: true,
    exerciseHydration: true,
    sleepGlucose: true,
    weightTrend: true,
    bloodPressureTrend: true,
    dailyBloodPressureSummary: true,
    bpVsGlucose: true,
    correlationAnalysis: true,
  },
};

export function getUserPreferences(user: { preferences: unknown }): UserPreferences {
  if (!user.preferences) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = UserPreferencesSchema.parse(user.preferences);
    return parsed;
  } catch {
    // If parsing fails, return defaults
    return DEFAULT_PREFERENCES;
  }
}

export function validatePreferences(data: unknown): UserPreferences {
  try {
    return UserPreferencesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid preferences: ${error.message}`);
    }
    throw error;
  }
}
