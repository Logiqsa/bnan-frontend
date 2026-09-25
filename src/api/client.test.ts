import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, API_BASE_URL, apiRequest, tokenStore } from "./client";

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

  it("shows Mongoose field errors instead of the generic validation message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "VALIDATION_ERROR",
      message: "خطأ في البيانات المدخلة",
      errors: {
        email: "البريد الإلكتروني غير صالح",
        dateOfBirth: "تاريخ الميلاد غير صالح",
      },
    }), { status: 422, headers: { "Content-Type": "application/json" } })));

    await expect(apiRequest("/auth/register-teacher", { method: "POST" })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "البريد الإلكتروني غير صالح، تاريخ الميلاد غير صالح",
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

describe("API base URL", () => {
  it("always uses the production API, including during local development", () => {
    expect(API_BASE_URL).toBe("https://api.bnanacademysa.com/api/v1");
    expect(API_BASE_URL).not.toContain("localhost");
  });

  it("preserves the production URL and Authorization header for requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem("bnan_portal_access_token", "admin-token");

    await apiRequest("/curriculums");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bnanacademysa.com/api/v1/curriculums",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-token" }) }),
    );
    localStorage.removeItem("bnan_portal_access_token");
  });
});

describe("binary API responses", () => {
  afterEach(() => {
    tokenStore.clear();
    vi.unstubAllGlobals();
  });

  it("returns a Blob and preserves Authorization for blob requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("certificate", { status: 200, headers: { "Content-Type": "application/pdf" } }));
    vi.stubGlobal("fetch", fetchMock);
    tokenStore.set("certificate-token", "refresh-token");

    const result = await apiRequest<Blob>("/certificates/c1/file?type=pdf", { responseType: "blob" });

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("application/pdf");
    expect(result.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/certificates/c1/file?type=pdf`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer certificate-token" }),
      }),
    );
  });

  it("keeps JSON response parsing unchanged", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })));

    await expect(apiRequest<{ success: boolean }>("/certificates/my")).resolves.toEqual({ success: true });
  });

  it("refreshes once after a 401 and retries the original blob request", async () => {
    tokenStore.set("expired-token", "refresh-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "NOT_LOGGED_IN", message: "expired" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "new-token", refreshToken: "new-refresh-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("certificate", { status: 200, headers: { "Content-Type": "application/pdf" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<Blob>("/certificates/c1/file?type=pdf", { responseType: "blob" });

    expect(result.type).toBe("application/pdf");
    expect(result.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${API_BASE_URL}/auth/refresh-token`, expect.anything());
    expect(fetchMock).toHaveBeenNthCalledWith(3, `${API_BASE_URL}/certificates/c1/file?type=pdf`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer new-token" }),
    }));
  });
});
