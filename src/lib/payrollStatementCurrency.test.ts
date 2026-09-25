import { describe, expect, it } from "vitest";
import {
  formatPayrollStatementMoney,
  payrollStatementCurrencyName,
  payrollStatementCurrencySymbol,
} from "./payrollStatementCurrency";

describe("payroll statement currency formatting", () => {
  it("uses the existing Arabic symbols for EGP and SAR without conversion", () => {
    expect(payrollStatementCurrencyName("EGP")).toBe("جنيه مصري");
    expect(payrollStatementCurrencySymbol("EGP")).toBe("جنيه");
    expect(formatPayrollStatementMoney(150, "EGP", "en-US")).toBe("150 جنيه");

    expect(payrollStatementCurrencyName("SAR")).toBe("ريال سعودي");
    expect(payrollStatementCurrencySymbol("SAR")).toBe("ر.س");
    expect(formatPayrollStatementMoney(150, "SAR", "en-US")).toBe("150 ر.س");
  });

  it("preserves an existing historical currency code", () => {
    expect(formatPayrollStatementMoney(150, "USD", "en-US")).toBe("150 USD");
  });
});
