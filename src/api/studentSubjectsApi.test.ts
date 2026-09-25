import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentSubjectsApi } from "./studentSubjectsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentSubjectsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());
  it("loads only the current Student subjects endpoint", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [{ id: "s1", name: "الرياضيات" }] });
    await expect(studentSubjectsApi.list()).resolves.toEqual([{ id: "s1", name: "الرياضيات" }]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/students/me/subjects");
  });

  it("normalizes the existing Mongo identifier fallback without adding metadata", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, data: [{ _id: "s2", name: "العلوم" }] });
    await expect(studentSubjectsApi.list()).resolves.toEqual([{ id: "s2", name: "العلوم" }]);
  });
});
