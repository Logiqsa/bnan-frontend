import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentHomeApi } from "./studentHomeApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentHomeApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads the current student's home summary", async () => {
    const data = { student: { id: "student-1", userId: "user-1" }, subscription: null, subscriptions: [], stats: {}, generatedAt: "2026-09-23T00:00:00.000Z" };
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data });

    await expect(studentHomeApi.get()).resolves.toEqual(data);
    expect(apiRequest).toHaveBeenCalledWith("/students/me/home");
  });
});
