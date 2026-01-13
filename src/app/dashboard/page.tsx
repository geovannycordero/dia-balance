import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { DashboardClient } from '@/app/dashboard/DashboardClient';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPreferences } from '@/lib/user-preferences';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any).id as string | undefined;

  if (!userId) {
    redirect('/auth/signin');
  }

  // Calculate 24 hours ago in UTC
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const [actions, user] = await Promise.all([
    prisma.action.findMany({
      where: {
        userId,
        timestamp: {
          gte: twentyFourHoursAgo.toISOString(),
        },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true, name: true, email: true },
    }),
  ]);

  const preferences = getUserPreferences(user ?? { preferences: null });
  const userName = user?.name || session.user.email || 'User';

  return (
    <DashboardClient initialActions={actions} userName={userName} userPreferences={preferences} />
  );
}
