import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CurrencyCode = "SAR" | "EGP" | "USD" | "AED" | "KWD" | "QAR";

// Map curriculum id -> default currency
export const CURRICULUM_CURRENCY: Record<string, CurrencyCode> = {
  saudi: "SAR",
  egyptian: "EGP",
  kuwaiti: "KWD",
  qatari: "QAR",
  emirati: "AED",
};

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س" },
  { code: "EGP", label: "جنيه مصري", symbol: "ج.م" },
  { code: "USD", label: "دولار أمريكي", symbol: "$" },
  { code: "AED", label: "درهم إماراتي", symbol: "د.إ" },
  { code: "KWD", label: "دينار كويتي", symbol: "د.ك" },
  { code: "QAR", label: "ريال قطري", symbol: "ر.ق" },
];

// Fallback rates (1 SAR = X) — used if API fails
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  SAR: 1,
  EGP: 13.2,
  USD: 0.27,
  AED: 0.98,
  KWD: 0.082,
  QAR: 0.97,
};

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: Record<CurrencyCode, number>;
  convert: (sarAmount: number) => number;
  format: (sarAmount: number) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("preferred_currency") : null;
    return (saved as CurrencyCode) || "SAR";
  });
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchRates = async () => {
      try {
        // Free, no-key API
        const res = await fetch("https://open.er-api.com/v6/latest/SAR");
        const data = await res.json();
        if (cancelled || !data?.rates) return;
        const r: Record<CurrencyCode, number> = {
          SAR: 1,
          EGP: data.rates.EGP ?? FALLBACK_RATES.EGP,
          USD: data.rates.USD ?? FALLBACK_RATES.USD,
          AED: data.rates.AED ?? FALLBACK_RATES.AED,
          KWD: data.rates.KWD ?? FALLBACK_RATES.KWD,
          QAR: data.rates.QAR ?? FALLBACK_RATES.QAR,
        };
        setRates(r);
      } catch (e) {
        console.warn("Currency rates fetch failed, using fallback", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRates();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem("preferred_currency", c);
    } catch {}
  };

  const convert = (sarAmount: number) => sarAmount * (rates[currency] ?? 1);

  const format = (sarAmount: number) => {
    const value = convert(sarAmount);
    const meta = CURRENCIES.find((c) => c.code === currency)!;
    const rounded = currency === "KWD" ? value.toFixed(2) : Math.round(value).toLocaleString("en-US");
    return `${rounded} ${meta.symbol}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
