import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "./authApi";
import { apiRequest } from "./client";
import { teacherPayoutProfileApi } from "./teacherPayoutProfileApi";

vi.mock("./client", () => ({
  API_BASE_URL: "https://example.test/api/v1",
  ApiError: class ApiError extends Error {},
  apiRequest: vi.fn(),
  refreshAccessToken: vi.fn(),
  tokenStore: { get: vi.fn(), getRefresh: vi.fn(), isPersistent: vi.fn(), set: vi.fn(), clear: vi.fn() },
}));

describe("teacherPayoutProfileApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads the current teacher payout profile", async () => {
    const profile = { method: "instapay", accountHolderName: "Teacher", instapayAddress: "teacher@instapay" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: profile });

    await expect(teacherPayoutProfileApi.get()).resolves.toEqual(profile);
    expect(apiRequest).toHaveBeenCalledWith("/teachers/me/payout-profile");
  });

  it("updates the current user's phone using the supported request body", async () => {
    const response = { success: true as const, data: { phone: "01000000000" } };
    vi.mocked(apiRequest).mockResolvedValue(response);

    await expect(authApi.updatePhone("01000000000")).resolves.toEqual(response);
    expect(apiRequest).toHaveBeenCalledWith("/users/me/phone", {
      method: "PATCH",
      body: JSON.stringify({ phone: "01000000000" }),
    });
  });

  it("updates the current teacher payout profile without extra fields", async () => {
    const body = { method: "wallet" as const, accountHolderName: "Teacher", walletProvider: "Provider", walletPhone: "01000000000" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: body });

    await expect(teacherPayoutProfileApi.update(body)).resolves.toEqual(body);
    expect(apiRequest).toHaveBeenCalledWith("/teachers/me/payout-profile", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  });
});
