import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { adminPayrollApi } from "./adminPayrollApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("adminPayrollApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("lists and filters admin payrolls", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [] });
    await adminPayrollApi.list({ status: "draft", teacherId: "teacher-1" });
    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls?status=draft&teacherId=teacher-1");
  });

  it("loads teacher preview using the backend period contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    await adminPayrollApi.teacherPreview("teacher-1", "2026-09-01", "2026-09-30");
    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls/teachers/teacher-1/preview?from=2026-09-01&to=2026-09-30");
  });

  it("loads the curriculum statement preview with the backend query contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { curriculum: {}, period: {}, teachers: [] } });
    await adminPayrollApi.curriculumStatementPreview("curriculum-1", "2026-09-01", "2026-09-30");
    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls/statement-preview?curriculumId=curriculum-1&from=2026-09-01&to=2026-09-30");
  });

  it("creates a statement with the selected snapshot currency", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    const body = {
      teacherId: "teacher-1",
      curriculumId: "curriculum-1",
      from: "2026-09-01",
      to: "2026-09-30",
      currency: "SAR" as const,
      courseRates: [{ courseId: "course-1", hourlyRate: 100 }],
    };

    await adminPayrollApi.createStatement(body);

    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls/statements", {
      method: "POST",
      body: JSON.stringify(body),
    });
  });

  it("creates and updates drafts with JSON bodies", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    const input = { currency: "SAR", rates: [{ gradeId: "grade-1", rate: 50 }], bonus: 10, deduction: 2 };
    await adminPayrollApi.create({ ...input, teacherId: "teacher-1", period: { from: "2026-09-01", to: "2026-09-30" } });
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/admin/payrolls", { method: "POST", body: JSON.stringify({ ...input, teacherId: "teacher-1", period: { from: "2026-09-01", to: "2026-09-30" } }) });
    await adminPayrollApi.update("payroll-1", input);
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/admin/payrolls/payroll-1", { method: "PATCH", body: JSON.stringify(input) });
  });

  it("marks paid using the exact multipart receipt contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    const receipt = new File(["image"], "receipt.png", { type: "image/png" });
    await adminPayrollApi.pay("payroll-1", { receipt, paidAt: "2026-09-23", transactionReference: "REF-1", notes: "done" });
    const options = vi.mocked(apiRequest).mock.calls[0][1] as RequestInit;
    const body = options.body as FormData;
    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls/payroll-1/pay", expect.objectContaining({ method: "POST" }));
    expect(body.get("transferReceipt")).toBe(receipt);
    expect(body.get("paidAt")).toBe("2026-09-23");
    expect(body.get("transactionReference")).toBe("REF-1");
  });

  it("lists statements and uses the protected receipt endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [] });
    await adminPayrollApi.listStatements({ status: "sent" });
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/admin/payrolls/statements?status=sent");
    await adminPayrollApi.getStatementReceipt("statement-1");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/admin/payrolls/statements/statement-1/payment/receipt", { responseType: "blob" });
  });

  it("deletes only the requested statement through the admin endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "statement-1" } });

    await adminPayrollApi.deleteStatement("statement-1");

    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls/statements/statement-1", { method: "DELETE" });
  });

  it("updates the existing statement pricing without creating a new statement", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    const body = {
      gradeRates: [{ gradeId: "grade-1", hourlyRate: 75 }],
      courseRates: [{ courseId: "course-1", hourlyRate: 100 }],
      bonuses: 10,
      deductions: 5,
    };

    await adminPayrollApi.updateStatement("statement-1", body);

    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls/statements/statement-1", { method: "PATCH", body: JSON.stringify(body) });
  });

  it("sends an existing draft statement", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });

    await adminPayrollApi.sendStatement("statement-1");

    expect(apiRequest).toHaveBeenCalledWith("/admin/payrolls/statements/statement-1/send", { method: "POST" });
  });
});
