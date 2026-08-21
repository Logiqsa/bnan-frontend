import { apiRequest } from "./client";
import type { AuthResponse } from "./types";

export const authApi = {
  login: (email: string, password: string) => apiRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  }),
  registerTeacher: (body: FormData) => apiRequest<AuthResponse>("/api/v1/auth/register-teacher", {
    method: "POST", body,
  }),
  profile: () => apiRequest<{ success: true; data: unknown }>("/api/v1/users/me"),
};

