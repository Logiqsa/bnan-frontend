import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { adminEvaluationsApi } from "./adminEvaluationsApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("adminEvaluationsApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("serializes the classroom and supported filters with exact backend names", async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    await adminEvaluationsApi.listEvaluations({ classroom: "c1", student: "s1", subject: "sub1", week: 3, from: "2026-09-01", to: "2026-09-30", page: 2, limit: 20 });
    expect(apiRequest).toHaveBeenCalledWith("/admin/evaluations?classroom=c1&student=s1&subject=sub1&week=3&from=2026-09-01&to=2026-09-30&page=2&limit=20");
  });

  it("uses the detail endpoint and URL-encodes the evaluation id", async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    await adminEvaluationsApi.getEvaluation("evaluation/1");
    expect(apiRequest).toHaveBeenCalledWith("/admin/evaluations/evaluation%2F1");
  });
});
