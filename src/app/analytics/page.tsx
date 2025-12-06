import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { AnalyticsClient } from '@/app/analytics/AnalyticsClient';
import { authOptions } from '@/lib/auth';

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <AnalyticsClient />;
}
