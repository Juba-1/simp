'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  formatDisplayDate,
  parseIsoDate,
  toIsoDateString,
} from '@/lib/datetime/iso';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value?: string | null;
  onChange: (value: string | undefined) => void;
  locale: Locale;
  dir: 'rtl' | 'ltr';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  locale,
  dir,
  placeholder,
  disabled,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value ?? undefined);
  const display = formatDisplayDate(value ?? undefined, locale);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          dir="ltr"
          className={cn(
            'h-12 w-full justify-start gap-2 px-3 text-start text-base font-normal',
            !display && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate tabular-nums">
            {display || placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir={dir}>
        <Calendar
          mode="single"
          uiLocale={locale}
          dir={dir}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? toIsoDateString(date) : undefined);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
