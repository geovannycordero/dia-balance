import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { DashboardClient } from '@/app/dashboard/DashboardClient';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  const actions = await prisma.action.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  return <DashboardClient initialActions={actions} userEmail={session.user.email ?? ''} />;
}
