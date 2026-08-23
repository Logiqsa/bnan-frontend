import { apiRequest } from "./client";

export type AdminUserRole = "student" | "parent" | "teacher" | "supervisor";
export type AdminUserStatus = "active" | "inactive" | "blocked" | string;

export interface AdminUser {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUsersResponse {
  success: true;
  data: AdminUser[];
  page?: number;
  limit?: number;
  total?: number;
  hasNextPage?: boolean;
}

export const adminUsersApi = {
  list: (role?: AdminUserRole, page = 1) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (role) params.set("role", role);
    return apiRequest<AdminUsersResponse>(`/users?${params.toString()}`);
  },
  get: (id: string) =>
    apiRequest<{ success: true; data: AdminUser }>(`/users/${id}`),
};
