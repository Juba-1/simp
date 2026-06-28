'use client';

import { useEffect } from 'react';
import { useSyncStore } from '@/stores/sync-store';
import { useAuthStore } from '@/stores/auth-store';

export function useSyncManager() {
  const initialize = useSyncStore((s) => s.initialize);
  const processQueue = useSyncStore((s) => s.processQueue);
  const isInitialized = useSyncStore((s) => s.isInitialized);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Flush silently as soon as the session is authenticated (e.g. right after
  // login or a token refresh) so nothing waits for the next poll tick.
  useEffect(() => {
    if (!isInitialized || !accessToken) return;
    if (navigator.onLine) {
      void processQueue();
    }
  }, [isInitialized, accessToken, processQueue]);

  useEffect(() => {
    if (!isInitialized || pendingCount === 0) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        void processQueue();
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [isInitialized, pendingCount, processQueue]);
}
