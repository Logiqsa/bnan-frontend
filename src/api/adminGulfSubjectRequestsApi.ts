import { apiRequest } from "@/api/client";

export type GulfSubjectRequestStatus = "awaiting_admin_approval" | "pending" | "assigned" | "rejected" | "cancelled";
export interface GulfRequestEntity { id?: string; name?: string | null; type?: string | null; hours?: number | null; months?: number | null; accessScope?: string | null; price?: number | null; currency?: string | null; registrationMode?: string | null; }
export interface GulfRequestUser { id?: string; fullName?: string | null; email?: string | null; }
export interface GulfRequestStudent { id?: string; user?: GulfRequestUser | null; }
export interface GulfRequestPayment { id?: string; paymentModel?: string | null; status?: string | null; paymentStatus?: string | null; provider?: string | null; providerStatus?: string | null; amount?: number | null; currency?: string | null; providerOrderId?: string | null; providerCheckoutId?: string | null; providerPaymentId?: string | null; processedAt?: string | null; completedAt?: string | null; paidAt?: string | null; failureReason?: string | null; createdAt?: string | null; updatedAt?: string | null; }
export interface AdminGulfSubjectRequest { id?: string; subjectRequestId?: string; student?: GulfRequestStudent | null; parent?: { id?: string; user?: GulfRequestUser | null } | null; curriculum?: GulfRequestEntity | null; grade?: GulfRequestEntity | null; subject?: GulfRequestEntity | null; package?: GulfRequestEntity | null; status?: GulfSubjectRequestStatus | string | null; notes?: string | null; payment?: GulfRequestPayment | null; paymentItem?: { id?: string } | null; subscription?: { id?: string } | null; assignment?: { teacher?: { id?: string; user?: GulfRequestUser | null } | null; classroom?: GulfRequestEntity | null; chatRoom?: { id?: string } | null; assignedAt?: string | null } | null; approvedBy?: GulfRequestUser | null; approvedAt?: string | null; rejectedBy?: GulfRequestUser | null; rejectedAt?: string | null; requestedAt?: string | null; createdAt?: string | null; updatedAt?: string | null; }
export interface AdminGulfSubjectRequestFilters { status?: string; student?: string; curriculum?: string; subject?: string; package?: string; paymentStatus?: string; provider?: string; from?: string; to?: string; page?: number; limit?: number; }
export interface AdminPagination { current_page: number; last_page: number; per_page: number; total: number; }
interface ListResponse { success: true; results: number; data: AdminGulfSubjectRequest[]; pagination: AdminPagination; }
interface DetailResponse { success: true; data: AdminGulfSubjectRequest; }

const queryString = (filters: AdminGulfSubjectRequestFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return query.toString();
};

export const adminGulfSubjectRequestsApi = {
  list: async (filters: AdminGulfSubjectRequestFilters = {}) => {
    const query = queryString(filters);
    return apiRequest<ListResponse>(`/admin/gulf-subject-requests${query ? `?${query}` : ""}`);
  },
  getById: async (id: string) => (await apiRequest<DetailResponse>(`/admin/gulf-subject-requests/${encodeURIComponent(id)}`)).data,
};
