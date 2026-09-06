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

  it("passes the selected page size when listing users", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ success: true, data: [], hasNextPage: false });

    await adminUsersApi.list("student", 3, undefined, undefined, 50);

    expect(apiRequest).toHaveBeenCalledWith("/users?page=3&limit=50&role=student");
  });

  it("marks a user as verified", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      success: true,
      data: { id: "user-42", role: "student", isVerified: true },
    });

    await adminUsersApi.markVerified("user-42");

    expect(apiRequest).toHaveBeenCalledWith("/admin/users/user-42/verify", {
      method: "PATCH",
    });
  });

  it("loads every page of unverified teachers", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: "teacher-1", role: "teacher", isVerified: false }],
        currentPage: 1,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: "teacher-2", role: "teacher", isVerified: false }],
        currentPage: 2,
        totalPages: 2,
      });

    await expect(adminUsersApi.listAll("teacher", false)).resolves.toHaveLength(2);
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/users?page=1&limit=100&role=teacher&isVerified=false");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/users?page=2&limit=100&role=teacher&isVerified=false");
  });
});
