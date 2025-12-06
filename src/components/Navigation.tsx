'use client';

import { BarChart3, Home, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

import { DarkModeToggle } from '@/components/DarkModeToggle';

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  if (!session?.user) {
    return null;
  }

  const userEmail = session.user.email ?? '';

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              pathname === '/dashboard'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/analytics"
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              pathname === '/analytics'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-600 dark:text-slate-400 sm:inline">
            {userEmail}
          </span>
          <DarkModeToggle />
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Sign out"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
