import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentSubscriptionApi } from "./studentSubscriptionApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentSubscriptionApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  it("reads the confirmed Student subscription endpoint", async () => {
    const subscription = { id: "sub-1", computedStatus: "active" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { ...subscription, subscription, subscriptions: [subscription] } });
    await expect(studentSubscriptionApi.get()).resolves.toEqual({ subscription, subscriptions: [subscription] });
    expect(apiRequest).toHaveBeenCalledWith("/students/me/subscription");
  });

  it.each([
    [{ page: 2, limit: 20 }, "/students/me/subscriptions/history?page=2&limit=20"],
    [{ page: 1, limit: 10, status: "expired" as const }, "/students/me/subscriptions/history?page=1&limit=10&status=expired"],
  ])("uses only the supported history query parameters", async (params, path) => {
    const response = { success: true as const, data: [], pagination: { current_page: 1, last_page: 1, per_page: 10, total: 0 } };
    vi.mocked(apiRequest).mockResolvedValue(response);
    await expect(studentSubscriptionApi.getHistory(params)).resolves.toBe(response);
    expect(apiRequest).toHaveBeenCalledWith(path);
    expect(path).not.toMatch(/studentId|subscriptionId|paymentId/);
  });
});
