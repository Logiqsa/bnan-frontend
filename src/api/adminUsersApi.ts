import { apiRequest } from "./client";

export type AdminUserRole = "student" | "parent" | "teacher" | "supervisor";
export type AdminUserStatus = "active" | "inactive" | "blocked";

export interface AdminUser {
  id: string;
  _id?: string;
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
  length?: number;
  currentPage?: number;
  totalCount?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
  total?: number;
  hasNextPage?: boolean;
}

type AdminUserPayload = Omit<AdminUser, "id"> & { id?: string; _id?: string };
type AdminUsersPayload = Omit<AdminUsersResponse, "data"> & { data: AdminUserPayload[] };

const normalizeUser = (item: AdminUserPayload): AdminUser => ({
  ...item,
  id: item.id || item._id || "",
});

const normalizeList = (result: AdminUsersPayload): AdminUsersResponse => ({
  ...result,
  data: result.data.map(normalizeUser),
  page: result.page ?? result.currentPage,
  total: result.total ?? result.totalCount,
});

export const adminUsersApi = {
  list: async (role?: AdminUserRole, page = 1) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (role) params.set("role", role);
    return normalizeList(await apiRequest<AdminUsersPayload>(`/users?${params.toString()}`));
  },
  get: async (id: string) => {
    const result = await apiRequest<{ success: true; data: AdminUserPayload }>(`/users/${id}`);
    return { ...result, data: normalizeUser(result.data) };
  },
  updateStatus: async (id: string, status: AdminUserStatus) => {
    const result = await apiRequest<{ success: true; data: AdminUserPayload }>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return { ...result, data: normalizeUser(result.data) };
  },
  delete: (id: string) =>
    apiRequest<{ success: true; message?: string }>(`/users/${id}`, {
      method: "DELETE",
    }),
};
