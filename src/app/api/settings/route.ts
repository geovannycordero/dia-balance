import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getUserPreferences,
  validatePreferences,
  UserPreferencesSchema,
  type UserPreferences,
} from '@/lib/user-preferences';

const updateSettingsSchema = z.object({
  name: z.string().max(100).optional(),
  preferences: UserPreferencesSchema.optional(),
});

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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      preferences: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const preferences = getUserPreferences(user);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    preferences,
  });
}

export async function PATCH(req: Request) {
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
  const parseResult = updateSettingsSchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const data = parseResult.data;
  const updateData: { name?: string | null; preferences?: UserPreferences } = {};

  if (data.name !== undefined) {
    updateData.name = data.name || null;
  }

  if (data.preferences !== undefined) {
    try {
      const validated = validatePreferences(data.preferences);
      updateData.preferences = validated;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid preferences' },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      preferences: true,
    },
  });

  const preferences = getUserPreferences(updated);

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    preferences,
  });
}
