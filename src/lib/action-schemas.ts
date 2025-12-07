import { z } from 'zod';

import { ActionType as ActionTypeEnum } from '@/app/constants/action-types';

export const ActionTypeSchema = z.enum([
  ActionTypeEnum.BLOOD_GLUCOSE,
  ActionTypeEnum.INSULIN,
  ActionTypeEnum.MEDICATION,
  ActionTypeEnum.FOOD,
  ActionTypeEnum.EXERCISE,
  ActionTypeEnum.SLEEP,
  ActionTypeEnum.SYMPTOMS,
  ActionTypeEnum.WEIGHT,
  ActionTypeEnum.HYDRATION,
  ActionTypeEnum.BLOOD_PRESSURE,
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

export const baseActionSchema = z.object({
  id: z.string().optional(),
  type: ActionTypeSchema,
  timestamp: z.string().datetime().optional(), // ISO string from client
  notes: z.string().max(1000).optional().nullable(),
});

export const bloodGlucoseSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.BLOOD_GLUCOSE),
  bloodGlucose: z.number().positive(),
  glucoseContext: z.enum(['fasting', 'pre-meal', 'post-meal', 'bedtime']).optional().nullable(),
});

export const insulinSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.INSULIN),
  insulinType: z.string().min(1),
  insulinUnits: z.number().positive(),
});

export const medicationSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.MEDICATION),
  medicationName: z.string().min(1),
  medicationDose: z.string().min(1),
});

export const foodSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.FOOD),
  foodDescription: z.string().min(1),
});

export const exerciseSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.EXERCISE),
  exerciseType: z.string().min(1),
  exerciseDuration: z.number().int().positive(),
  exerciseIntensity: z.string().min(1),
});

export const sleepSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.SLEEP),
  sleepHours: z.number().positive(),
  sleepQuality: z.number().int().min(1).max(5),
});

export const symptomsSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.SYMPTOMS),
  symptomDesc: z.string().min(1),
  symptomSeverity: z.number().int().min(1).max(10),
});

export const weightSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.WEIGHT),
  weightValue: z.number().positive(),
  weightUnit: z.string().default('kg'),
});

export const hydrationSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.HYDRATION),
  hydrationAmount: z.number().positive(),
});

export const bloodPressureSchema = baseActionSchema.extend({
  type: z.literal(ActionTypeEnum.BLOOD_PRESSURE),
  bloodPressureSystolic: z.number().int().positive().max(300),
  bloodPressureDiastolic: z.number().int().positive().max(200),
});

export const createActionSchema = z.discriminatedUnion('type', [
  bloodGlucoseSchema,
  insulinSchema,
  medicationSchema,
  foodSchema,
  exerciseSchema,
  sleepSchema,
  symptomsSchema,
  weightSchema,
  hydrationSchema,
  bloodPressureSchema,
]);

export type CreateActionInput = z.infer<typeof createActionSchema>;

// Update schema: allows partial updates, but type must be provided if changing action type
export const updateActionSchema = z.object({
  type: ActionTypeSchema.optional(),
  timestamp: z.string().datetime().optional(),
  notes: z.string().max(1000).optional().nullable(),
  bloodGlucose: z.number().positive().optional(),
  glucoseContext: z.enum(['fasting', 'pre-meal', 'post-meal', 'bedtime']).optional().nullable(),
  insulinType: z.string().min(1).optional(),
  insulinUnits: z.number().positive().optional(),
  medicationName: z.string().min(1).optional(),
  medicationDose: z.string().min(1).optional(),
  foodDescription: z.string().min(1).optional(),
  exerciseType: z.string().min(1).optional(),
  exerciseDuration: z.number().int().positive().optional(),
  exerciseIntensity: z.string().min(1).optional(),
  sleepHours: z.number().positive().optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  symptomDesc: z.string().min(1).optional(),
  symptomSeverity: z.number().int().min(1).max(10).optional(),
  weightValue: z.number().positive().optional(),
  weightUnit: z.string().optional(),
  hydrationAmount: z.number().positive().optional(),
  bloodPressureSystolic: z.number().int().positive().max(300).optional(),
  bloodPressureDiastolic: z.number().int().positive().max(200).optional(),
});

export type UpdateActionInput = z.infer<typeof updateActionSchema>;
