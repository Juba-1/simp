'use client';

import { useMemo } from 'react';
import { Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatDisplayTime,
  parseTime24,
  to12Hour,
  to24Hour,
  toTime24String,
} from '@/lib/datetime/iso';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface TimePickerProps {
  value?: string | null;
  onChange: (value: string | undefined) => void;
  locale: Locale;
  dir: 'rtl' | 'ltr';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  hourLabel?: string;
  minuteLabel?: string;
  periodLabel?: string;
  amLabel?: string;
  pmLabel?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimePicker({
  value,
  onChange,
  locale,
  dir,
  placeholder,
  disabled,
  className,
  id,
  hourLabel = 'Hour',
  minuteLabel = 'Minute',
  periodLabel = 'Period',
  amLabel = 'AM',
  pmLabel = 'PM',
}: TimePickerProps) {
  const parsed = parseTime24(value ?? undefined);
  const parts12 = parsed ? to12Hour(parsed) : null;
  const display = formatDisplayTime(value ?? undefined, locale);

  const hourValue = parts12 ? String(parts12.hour12) : '';
  const minuteValue = parts12 ? String(parts12.minute).padStart(2, '0') : '';
  const periodValue = parts12?.period ?? '';

  const minuteOptions = useMemo(
    () => MINUTES.map((m) => String(m).padStart(2, '0')),
    [],
  );

  function commit(hour12: number, minute: number, period: 'AM' | 'PM') {
    onChange(toTime24String(to24Hour({ hour12, minute, period })));
  }

  function handleHourChange(v: string) {
    const hour12 = Number(v);
    if (!hour12) return;
    commit(hour12, parts12?.minute ?? 0, parts12?.period ?? 'AM');
  }

  function handleMinuteChange(v: string) {
    const minute = Number(v);
    if (Number.isNaN(minute)) return;
    commit(parts12?.hour12 ?? 12, minute, parts12?.period ?? 'AM');
  }

  function handlePeriodChange(v: string) {
    if (v !== 'AM' && v !== 'PM') return;
    commit(parts12?.hour12 ?? 12, parts12?.minute ?? 0, v);
  }

  return (
    <Popover>
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
          <Clock3 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate tabular-nums">{display || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)] p-4" align="start" dir={dir}>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{hourLabel}</p>
            <Select value={hourValue} onValueChange={handleHourChange}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{minuteLabel}</p>
            <Select value={minuteValue} onValueChange={handleMinuteChange}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent dir={dir} className="max-h-48">
                {minuteOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{periodLabel}</p>
            <Select value={periodValue} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="AM">{amLabel}</SelectItem>
                <SelectItem value="PM">{pmLabel}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
