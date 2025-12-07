'use client';

import { BarChart3, Home, LogOut, Menu, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

import { DarkModeToggle } from '@/components/DarkModeToggle';

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Handle Escape key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Focus management: focus first menu item when drawer opens
  useEffect(() => {
    if (isMobileMenuOpen && firstMenuItemRef.current) {
      // Small delay to ensure drawer is visible
      setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 100);
    }
  }, [isMobileMenuOpen]);

  // Close menu when pathname changes (navigation occurred)
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!session?.user) {
    return null;
  }

  const userEmail = session.user.email ?? '';

  const navLinks = [
    { href: '/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Desktop Navigation */}
          <div className="hidden items-center gap-4 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={toggleMobileMenu}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop User Controls */}
          <div className="hidden items-center gap-3 md:flex">
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

          {/* Mobile User Controls (visible when menu closed) */}
          <div className="flex items-center gap-2 md:hidden">
            <DarkModeToggle />
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        id="mobile-menu"
        className={`fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] transform bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-950 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Menu</h2>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4" aria-label="Main navigation">
            <ul className="space-y-2">
              {navLinks.map((link, index) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                const isFirst = index === 0;
                return (
                  <li key={link.href}>
                    <Link
                      ref={isFirst ? firstMenuItemRef : null}
                      href={link.href}
                      onClick={closeMobileMenu}
                      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                        active
                          ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info Section */}
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Signed in as</p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                {userEmail}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  handleSignOut();
                }}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
