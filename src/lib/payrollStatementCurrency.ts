export type PayrollStatementCurrency = "EGP" | "SAR";

export const PAYROLL_STATEMENT_CURRENCIES: Array<{ code: PayrollStatementCurrency; label: string }> = [
  { code: "EGP", label: "جنيه مصري (EGP)" },
  { code: "SAR", label: "ريال سعودي (ر.س)" },
];

export const payrollStatementCurrencyName = (currency?: string | null) =>
  currency === "SAR" ? "ريال سعودي" : currency === "EGP" ? "جنيه مصري" : currency || "جنيه مصري";

export const payrollStatementCurrencySymbol = (currency?: string | null) =>
  currency === "SAR" ? "ر.س" : currency === "EGP" ? "جنيه" : currency || "جنيه";

export const formatPayrollStatementMoney = (value: number, currency?: string | null, locale = "ar-EG") =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${payrollStatementCurrencySymbol(currency)}`;
