import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentEvaluationsApi } from "./studentEvaluationsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentEvaluationsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("requests the current week without unsupported query parameters", async () => {
    const response = { success: true, results: 0, data: { mode: "egyptian", week: 4, subjects: [] } };
    vi.mocked(apiRequest).mockResolvedValue(response);
    await expect(studentEvaluationsApi.getMyWeeklyEvaluations()).resolves.toBe(response);
    expect(apiRequest).toHaveBeenCalledWith("/student-evaluations/me");
  });

  it("serializes only week and a non-empty classroomId", async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    await studentEvaluationsApi.getMyWeeklyEvaluations({ week: 3, classroomId: " classroom-1 " });
    expect(apiRequest).toHaveBeenCalledWith("/student-evaluations/me?week=3&classroomId=classroom-1");
  });

  it("omits empty optional values and cannot accept studentId", async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    await studentEvaluationsApi.getMyWeeklyEvaluations({ classroomId: " " });
    expect(apiRequest).toHaveBeenCalledWith("/student-evaluations/me");
    expect(vi.mocked(apiRequest).mock.calls[0][0]).not.toContain("studentId");
  });
});
