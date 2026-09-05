import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { adminUsersApi } from "./adminUsersApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("adminUsersApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("regenerates a verification code through the admin endpoint", () => {
    adminUsersApi.regenerateVerificationCode("user-42", "Internal account has no mailbox");

    expect(apiRequest).toHaveBeenCalledWith(
      "/admin/users/user-42/regenerate-verification-code",
      {
        method: "POST",
        body: JSON.stringify({ reason: "Internal account has no mailbox" }),
      },
    );
  });

  it("passes role and verification filters when listing unverified teachers", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: [], hasNextPage: false });
    await adminUsersApi.list("teacher", 2, false);

    expect(apiRequest).toHaveBeenCalledWith("/users?page=2&limit=20&role=teacher&isVerified=false");
  });

  it("trims and passes the user search query", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: [], hasNextPage: false });
    await adminUsersApi.list(undefined, 1, undefined, "  Ahmed  ");

    expect(apiRequest).toHaveBeenCalledWith("/users?page=1&limit=20&fullName=Ahmed");
  });
});
