export const SUPPORTED_LOCALES = ['en', 'ja'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'cogno_locale';

const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALE_SET.has(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function setLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;

  document.cookie = [
    `${LOCALE_COOKIE}=${locale}`,
    'Path=/',
    'Max-Age=31536000',
    'SameSite=Lax',
  ].join('; ');
}
