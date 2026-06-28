/** Parse YYYY-MM-DD to local Date (no timezone shift) */
export function parseIsoDate(value: string | undefined | null): Date | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

/** Format Date to YYYY-MM-DD for API / JSONB */
export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Display as DD / MM / YYYY (always LTR digits for clarity) */
export function formatDisplayDate(
  value: string | undefined | null,
  locale: 'en' | 'ar',
): string {
  const date = parseIsoDate(value);
  if (!date) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  if (locale === 'ar') {
    return `${dd} / ${mm} / ${yyyy}`;
  }
  return `${dd} / ${mm} / ${yyyy}`;
}

export interface Time24Parts {
  hour: number;
  minute: number;
}

/** Parse HH:mm (24h) */
export function parseTime24(value: string | undefined | null): Time24Parts | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return { hour, minute };
}

export function toTime24String(parts: Time24Parts): string {
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

export interface Time12Parts {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
}

export function to12Hour(parts: Time24Parts): Time12Parts {
  const period: 'AM' | 'PM' = parts.hour >= 12 ? 'PM' : 'AM';
  let hour12 = parts.hour % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: parts.minute, period };
}

export function to24Hour(parts: Time12Parts): Time24Parts {
  let hour = parts.hour12 % 12;
  if (parts.period === 'PM') hour += 12;
  return { hour, minute: parts.minute };
}

export function formatDisplayTime(
  value: string | undefined | null,
  locale: 'en' | 'ar',
): string {
  const parsed = parseTime24(value);
  if (!parsed) return '';
  const { hour12, minute, period } = to12Hour(parsed);
  const mm = String(minute).padStart(2, '0');
  const hh = String(hour12).padStart(2, '0');
  if (locale === 'ar') {
    const periodAr = period === 'AM' ? 'ص' : 'م';
    return `${hh}:${mm} ${periodAr}`;
  }
  return `${hh}:${mm} ${period}`;
}
