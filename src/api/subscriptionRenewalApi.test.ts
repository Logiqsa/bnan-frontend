import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { subscriptionRenewalApi } from "./subscriptionRenewalApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("subscriptionRenewalApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("creates an Egyptian renewal with a JSON body and no receipt upload", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { paymentId: "egyptian-1", status: "pending" },
    });
    const body = {
      subscriptionId: "subscription-1",
      packageId: "package-1",
      subjectId: "subject-1",
      discountCode: "SAVE10",
      method: "instapay" as const,
      referenceNumber: "REFERENCE-1",
    };

    await subscriptionRenewalApi.createEgyptianRenewal(body);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "/subscription-renewals/egyptian",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    const options = vi.mocked(apiRequest).mock.calls[0][1] as RequestInit;
    expect(options.body).not.toBeInstanceOf(FormData);
    expect(options.headers).toBeUndefined();
  });

  it("loads Egyptian renewal status using the encoded payment id", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { paymentId: "egyptian/1", status: "confirmed" },
    });

    await subscriptionRenewalApi.getEgyptianRenewalStatus("egyptian/1");

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "/subscription-renewals/egyptian/egyptian%2F1/status",
    );
  });

  it("creates a Gulf renewal with the supplied idempotency key", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: {
        paymentId: "gulf-1",
        checkoutUrl: "https://pay.example/checkout",
        status: "pending",
      },
    });
    const body = {
      subscriptionId: "subscription-1",
      packageId: "package-1",
      subjectId: "subject-1",
      provider: "tamara" as const,
      paymentAddress: {
        city: "Riyadh",
        region: "Riyadh",
        line1: "Main street",
        line2: null,
      },
      locale: "ar_SA",
      isMobile: false,
    };

    await subscriptionRenewalApi.createGulfRenewal(body, "renewal-attempt-1");

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/subscription-renewals/gulf", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": "renewal-attempt-1" },
    });
  });

  it("loads Gulf renewal status using the encoded payment id", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { paymentId: "gulf/1", status: "authorized" },
    });

    await subscriptionRenewalApi.getGulfRenewalStatus("gulf/1");

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "/subscription-renewals/gulf/gulf%2F1/status",
    );
  });

  it("exposes Gulf reconcile explicitly without invoking or retrying it automatically", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      success: true,
      data: { paymentId: "gulf/1", status: "completed" },
    });

    await subscriptionRenewalApi.reconcileGulfRenewal("gulf/1");

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "/subscription-renewals/gulf/gulf%2F1/reconcile",
      { method: "POST" },
    );
  });
});
