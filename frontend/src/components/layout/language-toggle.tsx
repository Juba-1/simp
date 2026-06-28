'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocaleStore } from '@/stores/locale-store';
import { useTranslation } from '@/stores/locale-store';
import type { Locale } from '@/lib/i18n';

export function LanguageToggle() {
  const { t, locale } = useTranslation();
  const setLocale = useLocaleStore((s) => s.setLocale);

  const options: { value: Locale; label: string }[] = [
    { value: 'en', label: t.language.en },
    { value: 'ar', label: t.language.ar },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change language">
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setLocale(opt.value)}
            className={locale === opt.value ? 'bg-accent' : ''}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
