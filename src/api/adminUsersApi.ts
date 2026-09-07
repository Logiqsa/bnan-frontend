import { apiRequest } from "./client";

export type AdminUserRole = "student" | "parent" | "teacher" | "supervisor" | "admin";
export type AdminUserStatus = "active" | "inactive" | "blocked";

export interface AdminUserReference {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  whatsappNumber?: string;
  role?: AdminUserRole;
}

export interface AdminUser {
  id: string;
  _id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  whatsappNumber?: string;
  role: AdminUserRole;
  status?: AdminUserStatus;
  isVerified?: boolean;
  curriculum?: string;
  grade?: string;
  createdAt?: string;
  updatedAt?: string;
  registrationStatus?: "pending" | "approved" | "rejected";
  paymentStatus?: "pending" | "confirmed" | "completed" | "rejected" | string;
  teacherStatus?: "pending" | "approved" | "rejected";
  parent?: AdminUserReference | string;
  parentInfo?: AdminUserReference;
  parentId?: AdminUserReference | string;
  parentUser?: AdminUserReference | string;
  guardian?: AdminUserReference | string;
  guardianId?: AdminUserReference | string;
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

export interface RegenerateVerificationCodeResponse {
  message: string;
  code: string;
  expiresAt: string;
}

type AdminUserPayload = Omit<AdminUser, "id"> & { id?: string; _id?: string };
type AdminUserEnvelope = AdminUserPayload & { user?: AdminUserPayload };
type AdminUsersPayload = Omit<AdminUsersResponse, "data"> & { data: AdminUserPayload[] };

const normalizeUser = (item: AdminUserPayload): AdminUser => ({
  ...item,
  id: item.id || item._id || "",
});

const normalizeUserEnvelope = (item: AdminUserEnvelope): AdminUser => normalizeUser(item.user || item);

const normalizeList = (result: AdminUsersPayload, requestedLimit = 20): AdminUsersResponse => ({
  ...result,
  data: result.data.map(normalizeUser),
  page: result.page ?? result.currentPage,
  total: result.total ?? result.totalCount,
  hasNextPage: result.totalPages !== undefined
    ? (result.page ?? result.currentPage ?? 1) < result.totalPages
    : result.hasNextPage ?? (
      result.total !== undefined || result.totalCount !== undefined
        ? (result.page ?? result.currentPage ?? 1) * (result.limit ?? requestedLimit) < (result.total ?? result.totalCount ?? 0)
        : result.data.length === requestedLimit
    ),
});

export const adminUsersApi = {
  list: async (role?: AdminUserRole, page = 1, isVerified?: boolean, search?: string, limit = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (role) params.set("role", role);
    if (isVerified !== undefined) params.set("isVerified", String(isVerified));
    if (search?.trim()) params.set("fullName", search.trim());
    return normalizeList(await apiRequest<AdminUsersPayload>(`/users?${params.toString()}`), limit);
  },
  listAll: async (role?: AdminUserRole, isVerified?: boolean) => {
    const users = new Map<string, AdminUser>();
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const result = await adminUsersApi.list(role, page, isVerified, undefined, 100);
      result.data.forEach((user) => users.set(user.id, user));
      hasNextPage = result.data.length > 0 && Boolean(result.hasNextPage);
      page += 1;
    }

    return [...users.values()];
  },
  get: async (id: string) => {
    const result = await apiRequest<{ success: true; data: AdminUserEnvelope | AdminUserEnvelope[] }>(`/users/${id}`);
    const details = Array.isArray(result.data) ? result.data[0] : result.data;
    return { ...result, data: details ? normalizeUserEnvelope(details) : normalizeUser({ id }) };
  },
  findTeacherByEmail: async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage) {
      const result = await adminUsersApi.list("teacher", page);
      const user = result.data.find((item) => item.email?.trim().toLowerCase() === normalizedEmail);
      if (user) return user;
      hasNextPage = result.hasNextPage ?? result.data.length === 20;
      page += 1;
    }
    return null;
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
  createAdmin: async (body: { fullName: string; email: string; password: string; phone?: string }) => {
    const result = await apiRequest<{ success: true; data: AdminUserPayload }>("/users/admins", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { ...result, data: normalizeUser(result.data) };
  },
  update: async (id: string, body: { fullName: string; email: string; phone?: string }) => {
    const result = await apiRequest<{ success: true; data: AdminUserEnvelope }>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return { ...result, data: normalizeUserEnvelope(result.data) };
  },
  markVerified: async (id: string) => {
    const result = await apiRequest<{ success: true; data: AdminUserEnvelope }>(`/admin/users/${id}/verify`, {
      method: "PATCH",
    });
    return { ...result, data: normalizeUserEnvelope(result.data) };
  },
  changePassword: (id: string, newPassword: string) =>
    apiRequest<{ success: true; message?: string }>(`/admin/users/${id}/password`, {
      method: "PATCH",
      body: JSON.stringify({ newPassword }),
    }),
  regenerateVerificationCode: (id: string, reason?: string) =>
    apiRequest<RegenerateVerificationCodeResponse>(`/admin/users/${id}/regenerate-verification-code`, {
      method: "POST",
      ...(reason ? { body: JSON.stringify({ reason }) } : {}),
    }),
};
