import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/api/client";
import { studentSettingsApi } from "./studentSettingsApi";

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }));

describe("studentSettingsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("uses the parent verification endpoint and forwards its password", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: { verificationToken: "proof", expiresAt: "later" } });
    await studentSettingsApi.verifyParentPassword("parent-secret");
    expect(apiRequest).toHaveBeenCalledWith("/students/me/settings-verification", {
      method: "POST",
      body: JSON.stringify({ parentPassword: "parent-secret" }),
    });
  });

  it("passes the one-use proof to name and password mutations", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true });
    await studentSettingsApi.updateName("New Student", "proof");
    await studentSettingsApi.updatePassword("new-password", "proof");
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/students/me/name", {
      method: "PATCH",
      body: JSON.stringify({ fullName: "New Student", verificationToken: "proof" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/students/me/password", {
      method: "PATCH",
      body: JSON.stringify({ updatedPassword: "new-password", verificationToken: "proof" }),
    });
  });
});
