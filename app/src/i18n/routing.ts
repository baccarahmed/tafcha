import { defineRouting } from 'next-intl/routing'

export const locales = ['fr', 'ar', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

/** Arabic is written right-to-left; French and English are left-to-right. */
export const rtlLocales: readonly Locale[] = ['ar']

export function isRtl(locale: Locale) {
  return rtlLocales.includes(locale)
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export const LOCALE_LABELS: Record<Locale, { label: string; native: string; flag: string }> = {
  fr: { label: 'Français', native: 'FR', flag: '🇫🇷' },
  ar: { label: 'العربية', native: 'ع', flag: '🇹🇳' },
  en: { label: 'English', native: 'EN', flag: '🇬🇧' },
}