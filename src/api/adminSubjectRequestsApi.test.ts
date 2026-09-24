import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminSubjectRequestsApi } from "@/api/adminSubjectRequestsApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("admin subject requests API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses only the backend-supported status and pagination filters", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data: [], total: 0, page: 2, limit: 20 });
    await adminSubjectRequestsApi.list({ status: "awaiting_admin_approval", page: 2, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/admin/subject-requests?status=awaiting_admin_approval&page=2&limit=20");
  });

  it("sends the required receiptImage multipart field and supported approval fields", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "request-1" } });
    const receipt = new File(["image"], "receipt.png", { type: "image/png" });
    await adminSubjectRequestsApi.approve("request-1", { receiptImage: receipt, amount: 250, method: "bank_transfer", referenceNumber: "ref-1", paymentNotes: "تم التحويل" });
    const [path, options] = vi.mocked(apiRequest).mock.calls[0];
    expect(path).toBe("/admin/subject-requests/request-1/approve");
    expect(options?.method).toBe("PATCH");
    const body = options?.body as FormData;
    expect(body.get("receiptImage")).toBe(receipt);
    expect(body.get("amount")).toBe("250");
    expect(body.get("method")).toBe("bank_transfer");
    expect(body.get("referenceNumber")).toBe("ref-1");
    expect(body.get("paymentNotes")).toBe("تم التحويل");
    expect(body.get("status")).toBeNull();
  });

  it("rejects with the backend's empty PATCH contract", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "request-1" } });
    await adminSubjectRequestsApi.reject("request-1");
    expect(apiRequest).toHaveBeenCalledWith("/admin/subject-requests/request-1/reject", { method: "PATCH" });
  });
});
