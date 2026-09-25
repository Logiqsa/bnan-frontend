import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentSubjectRequestHistoryApi } from "./studentSubjectRequestHistoryApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentSubjectRequestHistoryApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads the authenticated Student history from the exact endpoint", async () => {
    const item = {
      subjectRequestId: "request-1",
      curriculum: { id: "curriculum-1", name: "المنهج المصري", registrationMode: "egyptian" },
      subject: { id: "subject-1", name: "الرياضيات" },
      status: "awaiting_admin_approval",
      notes: "طلب جديد",
      requestedAt: "2026-09-23T10:00:00.000Z",
      package: { id: "package-1", name: "باقة المادة", type: "hours", hours: 10, price: 100, currency: "EGP" },
    };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 1, data: [item] });
    await expect(studentSubjectRequestHistoryApi.list()).resolves.toEqual([item]);
    expect(apiRequest).toHaveBeenCalledWith("/gulf-student-subject-requests");
    expect(vi.mocked(apiRequest).mock.calls[0][0]).not.toContain("studentId");
  });

  it("preserves an empty response", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data: [] });
    await expect(studentSubjectRequestHistoryApi.list()).resolves.toEqual([]);
  });

  it("preserves unknown statuses without remapping them", async () => {
    const item = { subjectRequestId: "request-2", curriculum: null, subject: null, status: "future_status", notes: null, requestedAt: "", package: null };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 1, data: [item] });
    const result = await studentSubjectRequestHistoryApi.list();
    expect(result[0].status).toBe("future_status");
  });
});
