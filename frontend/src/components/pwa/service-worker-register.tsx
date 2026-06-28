'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {
        /* Registration may fail on insecure contexts — non-fatal */
      });
  }, []);

  return null;
}
