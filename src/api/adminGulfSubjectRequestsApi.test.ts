import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminGulfSubjectRequestsApi } from "@/api/adminGulfSubjectRequestsApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("admin Gulf subject requests API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("sends only the backend-supported filters and pagination", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data: [], pagination: { current_page: 1, last_page: 0, per_page: 20, total: 0 } });
    await adminGulfSubjectRequestsApi.list({ status: "assigned", student: "student-1", paymentStatus: "completed", provider: "tamara", from: "2026-01-01", page: 1, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/admin/gulf-subject-requests?status=assigned&student=student-1&paymentStatus=completed&provider=tamara&from=2026-01-01&page=1&limit=20");
  });

  it("loads details and exposes no mutation method", async () => {
    const data = { id: "request-1", status: "assigned" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data });
    await expect(adminGulfSubjectRequestsApi.getById("request-1")).resolves.toEqual(data);
    expect(apiRequest).toHaveBeenCalledWith("/admin/gulf-subject-requests/request-1");
    expect("approve" in adminGulfSubjectRequestsApi).toBe(false);
    expect("reject" in adminGulfSubjectRequestsApi).toBe(false);
  });
});
