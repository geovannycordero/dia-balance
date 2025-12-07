import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { createActionSchema } from '@/lib/action-schemas';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actions = await prisma.action.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  return NextResponse.json(actions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const json = await req.json();

  const parseResult = createActionSchema.safeParse(json);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const data = parseResult.data;

  const timestamp = data.timestamp !== undefined ? new Date(data.timestamp) : new Date();

  const created = await prisma.action.create({
    data: {
      userId,
      type: data.type,
      timestamp,
      notes: data.notes ?? undefined,
      bloodGlucose: 'bloodGlucose' in data ? data.bloodGlucose : undefined,
      glucoseContext: 'glucoseContext' in data ? (data.glucoseContext ?? undefined) : undefined,
      insulinType: 'insulinType' in data ? (data.insulinType ?? undefined) : undefined,
      insulinUnits: 'insulinUnits' in data ? (data.insulinUnits ?? undefined) : undefined,
      medicationName: 'medicationName' in data ? (data.medicationName ?? undefined) : undefined,
      medicationDose: 'medicationDose' in data ? (data.medicationDose ?? undefined) : undefined,
      foodDescription: 'foodDescription' in data ? (data.foodDescription ?? undefined) : undefined,
      exerciseType: 'exerciseType' in data ? (data.exerciseType ?? undefined) : undefined,
      exerciseDuration:
        'exerciseDuration' in data ? (data.exerciseDuration ?? undefined) : undefined,
      exerciseIntensity:
        'exerciseIntensity' in data ? (data.exerciseIntensity ?? undefined) : undefined,
      sleepHours: 'sleepHours' in data ? (data.sleepHours ?? undefined) : undefined,
      sleepQuality: 'sleepQuality' in data ? (data.sleepQuality ?? undefined) : undefined,
      symptomDesc: 'symptomDesc' in data ? (data.symptomDesc ?? undefined) : undefined,
      symptomSeverity: 'symptomSeverity' in data ? (data.symptomSeverity ?? undefined) : undefined,
      weightValue: 'weightValue' in data ? (data.weightValue ?? undefined) : undefined,
      weightUnit: 'weightUnit' in data ? (data.weightUnit ?? undefined) : undefined,
      hydrationAmount: 'hydrationAmount' in data ? (data.hydrationAmount ?? undefined) : undefined,
      bloodPressureSystolic:
        'bloodPressureSystolic' in data ? (data.bloodPressureSystolic ?? undefined) : undefined,
      bloodPressureDiastolic:
        'bloodPressureDiastolic' in data ? (data.bloodPressureDiastolic ?? undefined) : undefined,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
