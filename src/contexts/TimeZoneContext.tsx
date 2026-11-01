import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const TIME_ZONE_STORAGE_KEY = "bnan_time_zone";
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
const initialTimeZone = (): SupportedTimeZone => {
  if (typeof window === "undefined") return DEFAULT_TIME_ZONE;
  const stored = window.localStorage.getItem(TIME_ZONE_STORAGE_KEY);
  return supported.has(stored || "") ? stored as SupportedTimeZone : DEFAULT_TIME_ZONE;
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
