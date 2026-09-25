import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentNotificationPreferencesApi } from "./studentNotificationPreferencesApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentNotificationPreferencesApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads only the authenticated user's preferences", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });

    await studentNotificationPreferencesApi.getPreferences();

    expect(apiRequest).toHaveBeenCalledWith("/notification-preferences/me");
  });

  it("patches only the supplied preference fields", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: {} });
    const payload = { categories: { academic: false } } as const;

    await studentNotificationPreferencesApi.updatePreferences(payload);

    expect(apiRequest).toHaveBeenCalledWith("/notification-preferences/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  });
});
