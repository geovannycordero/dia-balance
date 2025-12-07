import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { SettingsClient } from '@/app/settings/SettingsClient';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPreferences } from '@/lib/user-preferences';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string | undefined;

  if (!userId) {
    redirect('/auth/signin');
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
    redirect('/auth/signin');
  }

  const preferences = getUserPreferences(user);

  return (
    <SettingsClient
      initialName={user.name ?? ''}
      initialEmail={user.email}
      initialPreferences={preferences}
    />
  );
}
