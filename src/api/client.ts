export const API_BASE_URL = "https://api.bnanacademysa.com/api/v1";
const apiLanguage = () => localStorage.getItem("bnan_language") === "en" ? "en" : "ar";

const TOKEN_KEY = "bnan_portal_access_token";
const REFRESH_KEY = "bnan_portal_refresh_token";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public errors?: unknown, public data?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
  }
}

const textFromUnknown = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(Boolean).join("، ");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return textFromUnknown(record.message)
      || textFromUnknown(record.msg)
      || textFromUnknown(record.reason)
      || Object.values(record).map(textFromUnknown).filter(Boolean).join("، ");
  }
  return "";
};

const responseErrorMessage = (payload: Record<string, unknown>, rawBody: string) =>
  textFromUnknown(payload.message)
  || textFromUnknown(payload.error)
  || textFromUnknown(payload.errors)
  || rawBody.trim()
  || "حدث خطأ غير متوقع.";

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY),
  getRefresh: () => sessionStorage.getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY),
  isPersistent: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  set: (token: string, refreshToken: string, persistent = true) => {
    const target = persistent ? localStorage : sessionStorage;
    const other = persistent ? sessionStorage : localStorage;
    target.setItem(TOKEN_KEY, token);
    target.setItem(REFRESH_KEY, refreshToken);
    other.removeItem(TOKEN_KEY);
    other.removeItem(REFRESH_KEY);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};

// يمنع إطلاق أكثر من محاولة تجديد متزامنة عندما تفشل عدة طلبات بنفس اللحظة بسبب انتهاء صلاحية التوكن.
export type RefreshResult = "refreshed" | "rejected" | "unavailable";
let refreshPromise: Promise<RefreshResult> | null = null;

export async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return "rejected";
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", lang: apiLanguage() },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return [400, 401, 403].includes(response.status) ? "rejected" : "unavailable";
        }
        if (!payload.token || !payload.refreshToken) return "rejected";
        tokenStore.set(payload.token, payload.refreshToken || refreshToken, tokenStore.isPersistent());
        return "refreshed";
      } catch {
        return "unavailable";
      }
    })();
    refreshPromise.finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
  if (!API_BASE_URL) throw new ApiError(0, "API_NOT_CONFIGURED", "عنوان خدمة Bnan غير مضبوط.");
  const token = tokenStore.get();
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        lang: apiLanguage(),
        ...options.headers,
      },
    });
  } catch (error) {
    const technicalReason = error instanceof Error ? error.message.trim() : textFromUnknown(error);
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      technicalReason
        ? `لم يتمكن المتصفح من إرسال الطلب إلى الخادم. السبب التقني: ${technicalReason}`
        : "لم يتمكن المتصفح من إرسال الطلب إلى الخادم. تحقق من الاتصال وإعدادات CORS في الخادم.",
      undefined,
      { technicalReason, path },
    );
  }
  const rawBody = await response.text().catch(() => "");
  let payload: Record<string, unknown> = {};
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      payload = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
    } catch {
      payload = {};
    }
  }
  if (!response.ok) {
    if (response.status === 401) {
      if (token && !_retried) {
        const refreshResult = await refreshAccessToken();
        if (refreshResult === "refreshed") return apiRequest<T>(path, options, true);
        if (refreshResult === "unavailable") {
          throw new ApiError(0, "REFRESH_UNAVAILABLE", "تعذر تجديد الجلسة مؤقتًا. تحقق من الإنترنت وحاول مجددًا.");
        }
      }
      if (token) {
        tokenStore.clear();
        window.dispatchEvent(new Event("bnan:session-expired"));
      }
    }
    throw new ApiError(
      response.status,
      typeof payload.code === "string" ? payload.code : "API_ERROR",
      responseErrorMessage(payload, rawBody),
      payload.errors,
      payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : undefined,
    );
  }
  return payload as T;
}
