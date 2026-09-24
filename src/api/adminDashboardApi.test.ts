import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminDashboardApi } from "@/api/adminDashboardApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("admin dashboard API", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the existing dashboard statistics endpoint and unwraps statistics", async () => {
    const statistics = { totalStudents: 12, totalTeachers: 4, activeSubscriptions: 8, pendingReceipts: 2, todaySessions: 3 };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { statistics } });
    await expect(adminDashboardApi.statistics()).resolves.toEqual(statistics);
    expect(apiRequest).toHaveBeenCalledWith("/admin/dashboard/statistics");
  });
});
