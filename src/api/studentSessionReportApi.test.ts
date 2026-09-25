import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { studentSessionReportApi } from "./studentSessionReportApi";

vi.mock("./client", () => ({ apiRequest: vi.fn() }));

describe("studentSessionReportApi", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads only the requested session report with a minimal participant page", async () => {
    const response = {
      success: true as const,
      data: { sessionId: "session/one", status: "ready", summary: { uniqueParticipants: 2 } },
    };
    vi.mocked(apiRequest).mockResolvedValue(response);

    await expect(studentSessionReportApi.getReport("session/one")).resolves.toEqual(response);
    expect(apiRequest).toHaveBeenCalledWith("/sessions/session%2Fone/report?page=1&limit=1");
  });
});
