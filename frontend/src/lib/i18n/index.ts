import type { Dictionary, Locale } from './types';
import en from './dictionaries/en';
import ar from './dictionaries/ar';

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export type { Locale, Dictionary };
