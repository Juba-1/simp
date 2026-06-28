'use client';

import { useEffect } from 'react';
import { useLocaleStore } from '@/stores/locale-store';
import { useThemeStore } from '@/stores/theme-store';
import { Toaster } from '@/components/ui/sonner';
import { SyncManagerProvider } from '@/components/providers/sync-manager-provider';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    setLocale(locale);
    setTheme(theme);
  }, [locale, setLocale, theme, setTheme]);

  return (
    <ReactQueryProvider>
      <SyncManagerProvider>
        <ServiceWorkerRegister />
        {children}
        <Toaster richColors position="top-center" />
      </SyncManagerProvider>
    </ReactQueryProvider>
  );
}
