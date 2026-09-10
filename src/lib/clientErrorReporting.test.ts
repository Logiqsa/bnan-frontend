import { afterEach, describe, expect, it, vi } from "vitest";
import { reportClientError, sanitizeClientErrorMessage } from "./clientErrorReporting";

describe("reportClientError", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts only the diagnostic payload to the client-errors endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await reportClientError({
      phase: "uploading", errorCode: "NETWORK_ERROR", message: "failed",
      durationMs: 1200, name: "Teacher Name", email: "teacher@example.com", phone: "01000000000",
      filesCount: 4, totalSizeMB: 2.5, lastStep: 3,
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/client-errors$/), expect.objectContaining({ method: "POST" }));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toMatchObject({ source: "teacher-signup", platform: "web", phase: "uploading", name: "Teacher Name" });
    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("tokens");
    expect(payload).not.toHaveProperty("files");
  });

  it("redacts explicit secrets and common credential patterns from messages", () => {
    expect(sanitizeClientErrorMessage(
      "failed password=hunter2 otp:123456 Bearer abc.def token=my-token",
      ["hunter2"],
    )).toBe("failed password=[REDACTED] otp:[REDACTED] Bearer [REDACTED] token=[REDACTED]");
  });
});
