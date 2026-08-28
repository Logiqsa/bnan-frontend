const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// أثناء التطوير نمرر الطلبات عبر Vite لتفادي منع المتصفح للـ CORS preflight.
// في الإنتاج يمكن تغيير العنوان بدون تعديل الكود عبر VITE_API_BASE_URL.
export const API_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : (configuredApiUrl || "https://bnan.0xcode7.xyz/api/v1").replace(/\/$/, "");
const apiLanguage = () => localStorage.getItem("bnan_language") === "en" ? "en" : "ar";

const TOKEN_KEY = "bnan_portal_access_token";
const REFRESH_KEY = "bnan_portal_refresh_token";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public errors?: unknown, public data?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (token: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
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
        tokenStore.set(payload.token, payload.refreshToken || refreshToken);
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
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "تعذر الاتصال بالخدمة. تحقق من الإنترنت وحاول مجددًا.");
  }
  const payload = await response.json().catch(() => ({}));
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
    throw new ApiError(response.status, payload.code || "API_ERROR", payload.message || "حدث خطأ غير متوقع.", payload.errors, payload.data);
  }
  return payload as T;
}
