import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const TIME_ZONE_STORAGE_KEY = "bnan_time_zone";
export const TIME_ZONE_SOURCE_STORAGE_KEY = "bnan_time_zone_source";
export const TIME_ZONE_CHANGE_EVENT = "bnan:time-zone-change";
export const DEFAULT_TIME_ZONE = "Asia/Riyadh";

export const TIME_ZONE_OPTIONS = [
  { value: "Asia/Riyadh", ar: "السعودية", en: "Saudi Arabia" },
  { value: "Africa/Cairo", ar: "مصر", en: "Egypt" },
  { value: "Asia/Qatar", ar: "قطر", en: "Qatar" },
  { value: "Asia/Bahrain", ar: "البحرين", en: "Bahrain" },
  { value: "Asia/Dubai", ar: "الإمارات", en: "United Arab Emirates" },
] as const;

export type SupportedTimeZone = (typeof TIME_ZONE_OPTIONS)[number]["value"];

const supported = new Set<string>(TIME_ZONE_OPTIONS.map((item) => item.value));

export const selectedTimeZone = (): SupportedTimeZone => {
  if (typeof window === "undefined") return DEFAULT_TIME_ZONE;
  const stored = window.localStorage.getItem(TIME_ZONE_STORAGE_KEY);
  return supported.has(stored || "") ? stored as SupportedTimeZone : DEFAULT_TIME_ZONE;
};

const NativeDateTimeFormat = Intl.DateTimeFormat;
const nativeToLocaleString = Date.prototype.toLocaleString;
const nativeToLocaleDateString = Date.prototype.toLocaleDateString;
const nativeToLocaleTimeString = Date.prototype.toLocaleTimeString;
let userTimeZoneFormattingInstalled = false;

export const installUserTimeZoneFormatting = () => {
  if (userTimeZoneFormattingInstalled || typeof window === "undefined") return;
  userTimeZoneFormattingInstalled = true;

  const options = (value?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions => ({
    ...value,
    timeZone: value?.timeZone || selectedTimeZone(),
  });
  const UserDateTimeFormat = function (locales?: Intl.LocalesArgument, value?: Intl.DateTimeFormatOptions) {
    return new NativeDateTimeFormat(locales, options(value));
  } as unknown as typeof Intl.DateTimeFormat;
  UserDateTimeFormat.prototype = NativeDateTimeFormat.prototype;
  UserDateTimeFormat.supportedLocalesOf = NativeDateTimeFormat.supportedLocalesOf.bind(NativeDateTimeFormat);
  Intl.DateTimeFormat = UserDateTimeFormat;

  Date.prototype.toLocaleString = function (locales?: Intl.LocalesArgument, value?: Intl.DateTimeFormatOptions) {
    return nativeToLocaleString.call(this, locales, options(value));
  };
  Date.prototype.toLocaleDateString = function (locales?: Intl.LocalesArgument, value?: Intl.DateTimeFormatOptions) {
    return nativeToLocaleDateString.call(this, locales, options(value));
  };
  Date.prototype.toLocaleTimeString = function (locales?: Intl.LocalesArgument, value?: Intl.DateTimeFormatOptions) {
    return nativeToLocaleTimeString.call(this, locales, options(value));
  };
};

export const restoreNativeTimeZoneFormatting = () => {
  if (!userTimeZoneFormattingInstalled) return;
  Intl.DateTimeFormat = NativeDateTimeFormat;
  Date.prototype.toLocaleString = nativeToLocaleString;
  Date.prototype.toLocaleDateString = nativeToLocaleDateString;
  Date.prototype.toLocaleTimeString = nativeToLocaleTimeString;
  userTimeZoneFormattingInstalled = false;
};

const localeRegionTimeZones: Record<string, SupportedTimeZone> = {
  SA: "Asia/Riyadh",
  EG: "Africa/Cairo",
  QA: "Asia/Qatar",
  BH: "Asia/Bahrain",
  AE: "Asia/Dubai",
};

export const detectTimeZone = (
  browserTimeZone?: string,
  browserLocale?: string,
): SupportedTimeZone => {
  if (browserTimeZone && supported.has(browserTimeZone)) {
    return browserTimeZone as SupportedTimeZone;
  }
  const region = browserLocale?.match(/[-_]([A-Za-z]{2})(?:$|[-_])/)?.[1]?.toUpperCase();
  return (region && localeRegionTimeZones[region]) || DEFAULT_TIME_ZONE;
};

const initialTimeZone = (): SupportedTimeZone => {
  if (typeof window === "undefined") return DEFAULT_TIME_ZONE;
  const stored = window.localStorage.getItem(TIME_ZONE_STORAGE_KEY);
  const source = window.localStorage.getItem(TIME_ZONE_SOURCE_STORAGE_KEY);
  if (source === "explicit" && supported.has(stored || "")) return stored as SupportedTimeZone;
  const detected = detectTimeZone(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    window.navigator.language,
  );
  window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, detected);
  window.localStorage.setItem(TIME_ZONE_SOURCE_STORAGE_KEY, "auto");
  return detected;
};

interface TimeZoneContextValue {
  timeZone: SupportedTimeZone;
  setTimeZone: (value: SupportedTimeZone) => void;
  formatDateTime: (value: string | number | Date, locale: string, options?: Intl.DateTimeFormatOptions) => string;
}

const TimeZoneContext = createContext<TimeZoneContextValue | null>(null);

const fallbackContext: TimeZoneContextValue = {
  timeZone: DEFAULT_TIME_ZONE,
  setTimeZone: () => undefined,
  formatDateTime: (input, locale, options = {}) => {
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: DEFAULT_TIME_ZONE }).format(date);
  },
};

export function TimeZoneProvider({ children }: { children: ReactNode }) {
  const [timeZone, setTimeZoneState] = useState<SupportedTimeZone>(initialTimeZone);
  const value = useMemo<TimeZoneContextValue>(() => ({
    timeZone,
    setTimeZone: (next) => {
      setTimeZoneState(next);
      window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, next);
      window.localStorage.setItem(TIME_ZONE_SOURCE_STORAGE_KEY, "explicit");
      window.dispatchEvent(new CustomEvent(TIME_ZONE_CHANGE_EVENT, { detail: next }));
    },
    formatDateTime: (input, locale, options = {}) => {
      const date = input instanceof Date ? input : new Date(input);
      if (Number.isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
    },
  }), [timeZone]);

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}

export const useTimeZone = () => {
  const context = useContext(TimeZoneContext);
  return context ?? fallbackContext;
};
