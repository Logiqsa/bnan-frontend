import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { egyptianRegistrationRequestsApi } from "./egyptianRegistrationRequestsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("egyptianRegistrationRequestsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("sends the receipt and paid amount together", () => {
    const receipt = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });
    egyptianRegistrationRequestsApi.confirmPayment("student-1", { receipt, amount: 425.5 });
    const [url, options] = vi.mocked(apiRequest).mock.calls[0];
    const body = options?.body as FormData;
    expect(url).toBe("/admin/egyptian-registration-requests/student-1/payment");
    expect(options?.method).toBe("PATCH");
    expect(body.get("receiptImage")).toBe(receipt);
    expect(body.get("amount")).toBe("425.5");
    expect(body.get("method")).toBe("bank_transfer");
  });
});
