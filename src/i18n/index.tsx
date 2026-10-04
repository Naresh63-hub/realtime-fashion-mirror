import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export type Dict = Record<string, string>;

export type Locale = 'en' | 'hi-IN';

const STORAGE_KEY = 'vogue.i18n.lng';

const localePromises = {
  en: import('./locales/en').then((m) => m.default as Dict),
  'hi-IN': import('./locales/hi-IN').then((m) => m.default as Dict),
};

export const locales: Record<Locale, Promise<Dict>> = localePromises;

let currentLocale: Locale = 'en';
let currentDict: Dict | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((s) => s());
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export function t(key: string, params?: Record<string, string | number>): string {
  if (!currentDict) {
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.warn(`[i18n] Dictionary not loaded yet for key: ${key}`);
    }
    return key;
  }
  const value = currentDict[key];
  if (typeof value !== 'string') {
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.warn(`[i18n] Missing translation key: ${key}`);
    }
    return interpolate(key, params);
  }
  return interpolate(value, params);
}

function parseLngFromUrl(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const lng = params.get('lng');
    if (lng === 'en' || lng === 'hi-IN') return lng;
    if (lng === 'hi') return 'hi-IN';
  } catch {
    // ignore
  }
  return null;
}

function parseLngFromStorage(): Locale | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'hi-IN') return stored;
  } catch {
    // ignore
  }
  return null;
}

function parseLngFromNavigator(): Locale | null {
  if (typeof navigator === 'undefined' || !navigator.language) return null;
  const lng = navigator.language.toLowerCase();
  if (lng.startsWith('hi')) return 'hi-IN';
  return null;
}

export function getLocale(): Locale {
  return (
    parseLngFromUrl() ?? parseLngFromStorage() ?? parseLngFromNavigator() ?? 'en'
  );
}

export async function setLocale(lng: Locale): Promise<void> {
  currentLocale = lng;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      // ignore
    }
  }
  const dict = await localePromises[lng];
  currentDict = dict;
  notifySubscribers();
}

interface TranslationContextValue {
  t: typeof t;
  locale: Locale;
  setLocale: (lng: Locale) => Promise<void>;
}

export const TranslationContext = createContext<TranslationContextValue>({
  t,
  locale: 'en',
  setLocale,
});

export function useTranslation(): TranslationContextValue {
  const [locale, setLocaleState] = useState<Locale>(currentLocale);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const subscriber = () => {
      setLocaleState(currentLocale);
      forceTick((v) => v + 1);
    };
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  const setLocaleWrapped = useCallback(async (lng: Locale) => {
    await setLocale(lng);
  }, []);

  return useMemo(
    () => ({ t, locale, setLocale: setLocaleWrapped }),
    [locale, setLocaleWrapped]
  );
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const value = useTranslation();
  return React.createElement(TranslationContext.Provider, { value }, children);
}

if (typeof window !== 'undefined') {
  const initial = getLocale();
  currentLocale = initial;
  localePromises[initial].then((dict) => {
    currentDict = dict;
    notifySubscribers();
  });
}
