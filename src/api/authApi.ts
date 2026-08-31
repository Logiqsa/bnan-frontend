import { apiRequest } from "./client";
import type { AuthResponse, DirectRegisterBody, RegisterParentBody, RegistrationResponse } from "./types";

export const authApi = {
  login: (email: string, password: string) => apiRequest<AuthResponse>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  }),
  registerTeacher: (body: FormData) => apiRequest<RegistrationResponse>("/auth/register-teacher", {
    method: "POST", body,
  }),
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
  profile: () => apiRequest<{ success: true; data: unknown }>("/users/me"),
  updateName: (fullName: string) => apiRequest<{ success: true; data?: { fullName?: string } }>("/users/me/name", {
    method: "PATCH", body: JSON.stringify({ fullName }),
  }),
  updatePassword: (currentPassword: string, updatedPassword: string) =>
    apiRequest<{ success: true; token?: string; refreshToken?: string; data?: { token?: string; refreshToken?: string } }>("/auth/updatePassword", {
      method: "PATCH", body: JSON.stringify({ currentPassword, updatedPassword }),
    }),
};
