// لم يرد Production API URL في WEB_API_INTEGRATE.md أو إعدادات المشروع الحالية.
// ضع العنوان الموثق هنا عند توفيره، دون اختراع نطاق أو استخدام environment variables.
export const API_BASE_URL = "https://bnan.0xcode7.xyz";

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
  set: (token: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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
        lang: "ar",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "تعذر الاتصال بالخدمة. تحقق من الإنترنت وحاول مجددًا.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new Event("bnan:session-expired"));
    }
    throw new ApiError(response.status, payload.code || "API_ERROR", payload.message || "حدث خطأ غير متوقع.", payload.errors, payload.data);
  }
  return payload as T;
}
