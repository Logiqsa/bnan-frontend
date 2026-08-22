import { apiRequest } from "./client";
import type { AuthResponse, DirectRegisterBody, RegisterParentBody } from "./types";

export const authApi = {
  login: (email: string, password: string) => apiRequest<AuthResponse>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  }),
  registerTeacher: (body: FormData) => apiRequest<AuthResponse>("/auth/register-teacher", {
    method: "POST", body,
  }),
  registerParent: (body: RegisterParentBody) => apiRequest<AuthResponse>("/auth/register-parent", {
    method: "POST", body: JSON.stringify(body),
  }),
  registerStudent: (body: DirectRegisterBody) => apiRequest<{ success: true; data: { status: string } }>("/auth/register", {
    method: "POST", body: JSON.stringify(body),
  }),
  profile: () => apiRequest<{ success: true; data: unknown }>("/users/me"),
};

