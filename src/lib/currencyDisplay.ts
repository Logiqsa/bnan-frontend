const arabicCurrencyNames: Record<string, string> = {
  EGP: "جنيه مصري",
  SAR: "ريال سعودي",
  AED: "درهم إماراتي",
  KWD: "دينار كويتي",
  QAR: "ريال قطري",
  BHD: "دينار بحريني",
  OMR: "ريال عُماني",
};

export const arabicCurrencyName = (currency?: string) =>
  arabicCurrencyNames[String(currency || "").toUpperCase()] || currency || "";

export const formatArabicMoney = (amount: number, currency?: string) =>
  `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(amount)} ${arabicCurrencyName(currency)}`.trim();
