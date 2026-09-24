import { apiRequest } from "@/api/client";

export type AdminSubscriptionStatus = "active" | "grace_period" | "suspended" | "expired" | "cancelled";
export interface AdminFinancialEntity { id?: string; name?: string | null; type?: string | null; hours?: number | null; months?: number | null; accessScope?: string | null; price?: number | null; currency?: string | null; }
export interface AdminSubscriptionStudent { id?: string; user?: { id?: string; fullName?: string | null; email?: string | null } | null; parent?: { id?: string; user?: { fullName?: string | null; email?: string | null } | null } | null; curriculum?: AdminFinancialEntity | null; grade?: AdminFinancialEntity | null; }
export interface AdminSubscription { id?: string; student?: AdminSubscriptionStudent | null; parent?: AdminSubscriptionStudent["parent"]; curriculum?: AdminFinancialEntity | null; grade?: AdminFinancialEntity | null; package?: AdminFinancialEntity | null; subject?: AdminFinancialEntity | null; packageType?: string | null; accessScope?: string | null; purchasedHours?: number | null; remainingHours?: number | null; purchasedMonths?: number | null; paidPrice?: number | null; status?: AdminSubscriptionStatus | string | null; startDate?: string | null; endDate?: string | null; gracePeriodEndsAt?: string | null; payment?: { id?: string } | null; paymentItem?: { id?: string } | null; renewedFrom?: { id?: string } | null; createdAt?: string; updatedAt?: string; }
export interface AdminPagination { current_page: number; last_page: number; per_page: number; total: number; }
export interface AdminSubscriptionFilters { status?: string; student?: string; package?: string; curriculum?: string; registrationMode?: string; from?: string; to?: string; page?: number; limit?: number; }
interface SubscriptionListResponse { success: true; results: number; data: AdminSubscription[]; pagination: AdminPagination; }
interface SubscriptionDetailResponse { success: true; data: AdminSubscription; }

const queryString = (filters: AdminSubscriptionFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return query.toString();
};

export const adminSubscriptionsApi = {
  list: async (filters: AdminSubscriptionFilters = {}) => { const query = queryString(filters); return apiRequest<SubscriptionListResponse>(`/admin/subscriptions${query ? `?${query}` : ""}`); },
  getById: async (id: string) => (await apiRequest<SubscriptionDetailResponse>(`/admin/subscriptions/${encodeURIComponent(id)}`)).data,
};
