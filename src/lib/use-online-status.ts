'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  // Always start with false to match server-side rendering (no navigator on server)
  // This prevents hydration mismatch
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Update state only through event handlers or async callbacks, not synchronously
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial value after mount using requestAnimationFrame to avoid synchronous setState
    const rafId = requestAnimationFrame(() => {
      setIsOnline(navigator.onLine);
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
