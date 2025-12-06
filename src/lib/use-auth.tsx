'use client';

import { signOut, useSession } from 'next-auth/react';
import { useMemo } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();

  const user = useMemo(() => {
    if (!session?.user) return null;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: (session.user as any).id as string | undefined,
      name: session.user.name ?? '',
      email: session.user.email ?? '',
    };
  }, [session?.user]);

  const logout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return {
    user,
    isLoading: status === 'loading',
    logout,
  };
}
