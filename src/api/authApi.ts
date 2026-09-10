import axios, { AxiosError, type AxiosProgressEvent } from "axios";
import { API_BASE_URL, ApiError, apiRequest, refreshAccessToken, tokenStore } from "./client";
import type { AuthResponse, DirectRegisterBody, RegisterParentBody, RegistrationResponse } from "./types";

const apiLanguage = () => localStorage.getItem("bnan_language") === "en" ? "en" : "ar";

const errorText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join("، ");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return errorText(record.message)
      || errorText(record.msg)
      || errorText(record.reason)
      || Object.values(record).map(errorText).filter(Boolean).join("، ");
  }
  return "";
};

async function registerTeacher(
  body: FormData,
  idempotencyKey?: string,
  onUploadProgress?: (event: AxiosProgressEvent) => void,
  onResponseStatus?: (status: number) => void,
  retried = false,
): Promise<RegistrationResponse> {
  const token = tokenStore.get();
  let uploadCompletedLogged = false;
  try {
    console.log("[register-teacher] before axios.post", {
      url: `${API_BASE_URL}/auth/register-teacher`,
      hasToken: Boolean(token),
      hasIdempotencyKey: Boolean(idempotencyKey),
      retried,
    });
    const response = await axios.post<RegistrationResponse>(
      `${API_BASE_URL}/auth/register-teacher`,
      body,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          lang: apiLanguage(),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        onUploadProgress: (event) => {
          if (!uploadCompletedLogged && event.total && event.loaded >= event.total) {
            uploadCompletedLogged = true;
            console.log("[register-teacher] onUploadProgress 100%", {
              loaded: event.loaded,
              total: event.total,
            });
          }
          onUploadProgress?.(event);
        },
      },
    );
    console.log("[register-teacher] response success", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
    onResponseStatus?.(response.status);
    return response.data;
  } catch (value) {
    const error = value as AxiosError<Record<string, unknown>>;
    if (error.response) onResponseStatus?.(error.response.status);
    console.error("[register-teacher] axios catch", {
      code: error.code,
      message: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    });
    if (!error.response) {
      const technicalReason = error.message.trim();
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        technicalReason
          ? `لم يتمكن المتصفح من إرسال الطلب إلى الخادم. السبب التقني: ${technicalReason}`
          : "لم يتمكن المتصفح من إرسال الطلب إلى الخادم. تحقق من الاتصال وإعدادات CORS في الخادم.",
        undefined,
        { technicalReason, path: "/auth/register-teacher", axiosCode: error.code || "" },
      );
    }

    if (error.response.status === 401 && token) {
      if (!retried) {
        const refreshResult = await refreshAccessToken();
        if (refreshResult === "refreshed") {
          return registerTeacher(body, idempotencyKey, onUploadProgress, onResponseStatus, true);
        }
        if (refreshResult === "unavailable") {
          throw new ApiError(0, "REFRESH_UNAVAILABLE", "تعذر تجديد الجلسة مؤقتًا. تحقق من الإنترنت وحاول مجددًا.");
        }
      }
      tokenStore.clear();
      window.dispatchEvent(new Event("bnan:session-expired"));
    }

    const payload = error.response.data || {};
    throw new ApiError(
      error.response.status,
      typeof payload.code === "string" ? payload.code : "API_ERROR",
      errorText(payload.message)
        || errorText(payload.error)
        || errorText(payload.errors)
        || "حدث خطأ غير متوقع.",
      payload.errors,
      payload.data && typeof payload.data === "object"
        ? payload.data as Record<string, unknown>
        : undefined,
    );
  }
}

export const authApi = {
  login: (email: string, password: string) => apiRequest<AuthResponse>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  }),
  registerTeacher,
  registerParent: (body: RegisterParentBody) => apiRequest<RegistrationResponse>("/auth/register-parent", {
    method: "POST", body: JSON.stringify(body),
  }),
  registerStudent: (body: DirectRegisterBody) => apiRequest<RegistrationResponse>("/auth/register", {
    method: "POST", body: JSON.stringify(body),
  }),
  verifyAccount: (email: string, code: string) => apiRequest<{ success: true; message: string }>("/auth/verify-account", {
    method: "POST", body: JSON.stringify({ email, code }),
  }),
  resendVerificationCode: (email: string) => apiRequest<{ success: true; message: string }>("/auth/resend-verification-code", {
    method: "POST", body: JSON.stringify({ email }),
  }),
  forgotPassword: (email: string) => apiRequest<{ success: true; message: string }>("/auth/forgotPassword", {
    method: "POST", headers: { "Accept-Language": "ar" }, body: JSON.stringify({ email }),
  }),
  verifyResetCode: (resetCode: string) => apiRequest<{ success: true }>("/auth/verifyResetCode", {
    method: "POST", headers: { "Accept-Language": "ar" }, body: JSON.stringify({ resetCode }),
  }),
  resetPassword: (email: string, newPassword: string) => apiRequest<AuthResponse>("/auth/resetPassword", {
    method: "POST", headers: { "Accept-Language": "ar" }, body: JSON.stringify({ email, newPassword }),
  }),
  profile: () => apiRequest<{ success: true; data: unknown }>("/users/me"),
  updateName: (fullName: string) => apiRequest<{ success: true; data?: { fullName?: string } }>("/users/me/name", {
    method: "PATCH", body: JSON.stringify({ fullName }),
  }),
  updatePassword: (currentPassword: string, updatedPassword: string) =>
    apiRequest<{ success: true; token?: string; refreshToken?: string; data?: { token?: string; refreshToken?: string } }>("/auth/updatePassword", {
      method: "PATCH", body: JSON.stringify({ currentPassword, updatedPassword }),
    }),
};
