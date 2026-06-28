'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '@/lib/i18n';
import { getDirection, getDictionary } from '@/lib/i18n';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'ar',
      setLocale: (locale) => {
        const dir = getDirection(locale);
        document.documentElement.lang = locale;
        document.documentElement.dir = dir;
        set({ locale });
      },
    }),
    {
      name: 'simp-locale',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.lang = state.locale;
          document.documentElement.dir = getDirection(state.locale);
        }
      },
    },
  ),
);

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  return { t: getDictionary(locale), locale, dir: getDirection(locale) };
}
