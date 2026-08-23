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
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", lang: apiLanguage() },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.token) return false;
        tokenStore.set(payload.token, payload.refreshToken || refreshToken);
        return true;
      } catch {
        return false;
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
      if (!_retried && token && (await refreshAccessToken())) {
        return apiRequest<T>(path, options, true);
      }
      tokenStore.clear();
      window.dispatchEvent(new Event("bnan:session-expired"));
    }
    throw new ApiError(response.status, payload.code || "API_ERROR", payload.message || "حدث خطأ غير متوقع.", payload.errors, payload.data);
  }
  return payload as T;
}
