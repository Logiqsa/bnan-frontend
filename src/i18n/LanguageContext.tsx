import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "ar" | "en";

const STORAGE_KEY = "bnan_language";

interface LanguageContextValue {
  language: Language;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  pick: (arabic: string, english: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar");

  const setLanguage = (value: Language) => {
    localStorage.setItem(STORAGE_KEY, value);
    setLanguageState(value);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    isArabic: language === "ar",
    setLanguage,
    toggleLanguage: () => setLanguage(language === "ar" ? "en" : "ar"),
    pick: (arabic, english) => language === "ar" ? arabic : english,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
