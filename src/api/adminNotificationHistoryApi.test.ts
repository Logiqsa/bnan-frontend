import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminNotificationHistoryApi } from "@/api/adminNotificationHistoryApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));
const request = vi.mocked(apiRequest);

describe("adminNotificationHistoryApi", () => {
  it("uses the history endpoint and omits empty filters", async () => {
    request.mockResolvedValueOnce({} as never);
    await adminNotificationHistoryApi.list({ page: 2, limit: 50, audience: "student", status: "completed", from: "2026-01-01", to: "2026-01-31" });
    expect(request).toHaveBeenCalledWith("/admin/notifications/history?page=2&limit=50&audience=student&status=completed&from=2026-01-01&to=2026-01-31");
  });

  it("does not send undefined or empty filters", async () => {
    request.mockClear();
    request.mockResolvedValueOnce({} as never);
    await adminNotificationHistoryApi.list({ page: 1, limit: 20, audience: undefined, status: undefined, from: "", to: undefined });
    expect(request).toHaveBeenCalledWith("/admin/notifications/history?page=1&limit=20");
  });
});
