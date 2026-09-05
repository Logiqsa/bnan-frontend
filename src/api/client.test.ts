import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./client";

describe("apiRequest error details", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows validation details when the backend omits message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "VALIDATION_ERROR",
      errors: [{ message: "كلمة المرور يجب ألا تقل عن 8 أحرف" }],
    }), { status: 422, headers: { "Content-Type": "application/json" } })));

    await expect(apiRequest("/auth/register-parent", { method: "POST" })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "كلمة المرور يجب ألا تقل عن 8 أحرف",
    });
  });

  it("preserves a plain-text backend error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Registration is currently closed", { status: 503 })));

    await expect(apiRequest("/auth/register-teacher", { method: "POST" })).rejects.toMatchObject({
      status: 503,
      message: "Registration is currently closed",
    });
  });

  it("includes the browser reason when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await apiRequest("/auth/register-parent").catch((value: unknown) => value as ApiError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toContain("Failed to fetch");
  });
});
