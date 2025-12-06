'use client';

import { useEffect, useRef, useState } from 'react';

export function useOnlineStatus() {
  // Always start with false to match server-side rendering (no navigator on server)
  // This prevents hydration mismatch
  const [isOnline, setIsOnline] = useState(false);

  const timeoutExecutedRef = useRef(false);

  useEffect(() => {
    // Update state only through event handlers or async callbacks, not synchronously
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Reset the flag for this effect run
    timeoutExecutedRef.current = false;

    // Set initial value after mount using setTimeout to defer execution to next event loop tick
    // This prevents hydration mismatch by ensuring state update happens after hydration
    const timeoutId = setTimeout(() => {
      timeoutExecutedRef.current = true;
      setIsOnline(navigator.onLine);
    }, 0);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // Only cancel timeout if it hasn't executed yet
      if (!timeoutExecutedRef.current) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
