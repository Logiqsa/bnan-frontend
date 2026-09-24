import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { adminSubscriptionsApi } from "@/api/adminSubscriptionsApi";
import { adminPaymentsApi } from "@/api/adminPaymentsApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("admin financial API wrappers", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("sends subscription filters and backend pagination to the server", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 1, data: [], pagination: { current_page: 2, last_page: 3, per_page: 20, total: 41 } });
    await adminSubscriptionsApi.list({ status: "active", registrationMode: "gulf", from: "2026-01-01", page: 2, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/admin/subscriptions?status=active&registrationMode=gulf&from=2026-01-01&page=2&limit=20");
  });

  it("loads a subscription detail without exposing mutation methods", async () => {
    const data = { id: "subscription-1", status: "active" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data });
    await expect(adminSubscriptionsApi.getById("subscription-1")).resolves.toEqual(data);
    expect(apiRequest).toHaveBeenCalledWith("/admin/subscriptions/subscription-1");
    expect("cancel" in adminSubscriptionsApi).toBe(false);
  });

  it("sends payment filters and model details to the server", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, results: 0, data: [], pagination: { current_page: 1, last_page: 0, per_page: 20, total: 0 } });
    await adminPaymentsApi.list({ provider: "tamara", purpose: "renewal", paymentModel: "gulf", page: 1, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/admin/payments?provider=tamara&purpose=renewal&paymentModel=gulf&page=1&limit=20");
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: { id: "payment-1" } });
    await adminPaymentsApi.getById("payment-1", "gulf");
    expect(apiRequest).toHaveBeenCalledWith("/admin/payments/payment-1?paymentModel=gulf");
    expect("refund" in adminPaymentsApi).toBe(false);
  });
});
