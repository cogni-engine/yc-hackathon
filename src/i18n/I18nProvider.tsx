'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_LOCALE,
  isLocale,
  normalizeLocale,
  setLocaleCookie,
  type Locale,
} from './locales';
import { messages, type Messages } from './messages';

type PrimitiveMessage = string | number | boolean | null | undefined;
type DotPath<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, PrimitiveMessage | Record<string, unknown>>
      ? `${K}.${DotPath<T[K]>}`
      : never;
}[keyof T & string];

export type I18nKey = DotPath<Messages>;

type InterpolationValues = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: I18nKey, values?: InterpolationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveMessage(locale: Locale, key: I18nKey): string {
  const segments = key.split('.');
  let current: unknown = messages[locale];

  for (const segment of segments) {
    if (
      current == null ||
      typeof current !== 'object' ||
      !(segment in current)
    ) {
      return key;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : key;
}

function interpolate(template: string, values?: InterpolationValues) {
  if (!values) return template;

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    values[key] == null ? match : String(values[key])
  );
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    normalizeLocale(initialLocale)
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    setLocaleCookie(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    setLocaleCookie(nextLocale);
  }, []);

  const t = useCallback(
    (key: I18nKey, values?: InterpolationValues) =>
      interpolate(resolveMessage(locale, key), values),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
