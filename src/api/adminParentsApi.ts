import { apiRequest } from "@/api/client";
import type { AdminStudent, AdminStudentEntity, AdminStudentPagination, AdminStudentUser } from "@/api/adminStudentsApi";

export interface AdminParent { id?: string; user?: AdminStudentUser | null; phone?: string | null; whatsappNumber?: string | null; children?: Array<Pick<AdminStudent, "id" | "registrationType" | "registrationStatus" | "createdAt"> & { user?: AdminStudentUser | null; curriculum?: AdminStudentEntity | null; grade?: AdminStudentEntity | null }>; createdAt?: string | null; updatedAt?: string | null; }
export interface AdminParentFilters { search?: string; status?: string; phone?: string; whatsappNumber?: string; from?: string; to?: string; page?: number; limit?: number; }
interface AdminParentListResponse { success: true; results: number; data: AdminParent[]; pagination: AdminStudentPagination; }
interface AdminParentDetailResponse { success: true; data: AdminParent; }

const queryString = (filters: AdminParentFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return query.toString();
};

export const listAdminParents = async (filters: AdminParentFilters = {}) => {
  const query = queryString(filters);
  return apiRequest<AdminParentListResponse>(`/admin/parents${query ? `?${query}` : ""}`);
};

export const getAdminParent = async (id: string) => (await apiRequest<AdminParentDetailResponse>(`/admin/parents/${encodeURIComponent(id)}`)).data;
