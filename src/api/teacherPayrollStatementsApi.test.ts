import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { teacherPayrollStatementsApi } from "./teacherPayrollStatementsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("teacherPayrollStatementsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads only the authenticated teacher statements", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [] });
    await teacherPayrollStatementsApi.list();
    expect(apiRequest).toHaveBeenCalledWith("/teachers/me/payroll-statements");
  });

  it("loads statement details and the protected receipt", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    await teacherPayrollStatementsApi.get("statement-1");
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/teachers/me/payroll-statements/statement-1");
    await teacherPayrollStatementsApi.getReceipt("statement-1");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/teachers/me/payroll-statements/statement-1/payment/receipt", { responseType: "blob" });
  });
});
