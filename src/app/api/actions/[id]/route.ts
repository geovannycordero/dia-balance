import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { updateActionSchema } from '@/lib/action-schemas';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const json = await req.json();
  const parseResult = updateActionSchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const data = parseResult.data;

  const existing = await prisma.action.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const timestamp = data.timestamp !== undefined ? new Date(data.timestamp) : existing.timestamp;

  const updated = await prisma.action.update({
    where: { id },
    data: {
      timestamp,
      notes: data.notes ?? existing.notes ?? undefined,
      bloodGlucose: 'bloodGlucose' in data ? (data.bloodGlucose ?? null) : existing.bloodGlucose,
      glucoseContext:
        'glucoseContext' in data ? (data.glucoseContext ?? null) : existing.glucoseContext,
      insulinType: 'insulinType' in data ? (data.insulinType ?? null) : existing.insulinType,
      insulinUnits: 'insulinUnits' in data ? (data.insulinUnits ?? null) : existing.insulinUnits,
      medicationName:
        'medicationName' in data ? (data.medicationName ?? null) : existing.medicationName,
      medicationDose:
        'medicationDose' in data ? (data.medicationDose ?? null) : existing.medicationDose,
      foodDescription:
        'foodDescription' in data ? (data.foodDescription ?? null) : existing.foodDescription,
      exerciseType: 'exerciseType' in data ? (data.exerciseType ?? null) : existing.exerciseType,
      exerciseDuration:
        'exerciseDuration' in data ? (data.exerciseDuration ?? null) : existing.exerciseDuration,
      exerciseIntensity:
        'exerciseIntensity' in data ? (data.exerciseIntensity ?? null) : existing.exerciseIntensity,
      sleepHours: 'sleepHours' in data ? (data.sleepHours ?? null) : existing.sleepHours,
      sleepQuality: 'sleepQuality' in data ? (data.sleepQuality ?? null) : existing.sleepQuality,
      symptomDesc: 'symptomDesc' in data ? (data.symptomDesc ?? null) : existing.symptomDesc,
      symptomSeverity:
        'symptomSeverity' in data ? (data.symptomSeverity ?? null) : existing.symptomSeverity,
      weightValue: 'weightValue' in data ? (data.weightValue ?? null) : existing.weightValue,
      weightUnit: 'weightUnit' in data ? (data.weightUnit ?? null) : existing.weightUnit,
      hydrationAmount:
        'hydrationAmount' in data ? (data.hydrationAmount ?? null) : existing.hydrationAmount,
      bloodPressureSystolic:
        'bloodPressureSystolic' in data
          ? (data.bloodPressureSystolic ?? null)
          : existing.bloodPressureSystolic,
      bloodPressureDiastolic:
        'bloodPressureDiastolic' in data
          ? (data.bloodPressureDiastolic ?? null)
          : existing.bloodPressureDiastolic,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.action.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.action.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
