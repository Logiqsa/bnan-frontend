import { apiRequest } from "@/api/client";

export interface StudentSubscriptionEntity {
  id?: string; name?: string | null; type?: string | null; accessScope?: string | null;
  hours?: number | null; months?: number | null; price?: number | null; currency?: string | null;
}
export interface StudentSubscription {
  id?: string;
  student?: { id?: string; fullName?: string | null } | null;
  package?: StudentSubscriptionEntity | null;
  packageName?: string | null;
  packageType?: "hours" | "monthly" | string | null;
  accessScope?: "all_subjects" | "single_subject" | string | null;
  registrationMode?: "egyptian" | "gulf" | string | null;
  planKind?: string | null;
  subject?: StudentSubscriptionEntity | null;
  status?: string | null; computedStatus?: string | null; isActive?: boolean;
  canRenew?: boolean; hasPendingRenewal?: boolean;
  totalHours?: number | null; purchasedHours?: number | null; usedHours?: number | null;
  remainingHours?: number | null; purchasedMonths?: number | null; progressPercentage?: number | null;
  paidPrice?: number | null; startDate?: string | null; endDate?: string | null;
  gracePeriodEndsAt?: string | null; renewalDueDate?: string | null;
  renewedFrom?: string | { id?: string } | null;
  createdAt?: string | null; updatedAt?: string | null;
}
export interface StudentSubscriptionsData { subscription: StudentSubscription | null; subscriptions: StudentSubscription[]; }
interface StudentSubscriptionsEnvelope { success: true; data: StudentSubscription & StudentSubscriptionsData; }
export type StudentSubscriptionHistoryStatus = "active" | "grace_period" | "suspended" | "expired" | "cancelled";
export interface StudentSubscriptionHistoryPagination { current_page: number; last_page: number; per_page: number; total: number; }
export interface StudentSubscriptionHistoryResponse { success: true; data: StudentSubscription[]; pagination: StudentSubscriptionHistoryPagination; }
export const studentSubscriptionsQueryKey = ["student-subscriptions"] as const;
export const studentSubscriptionHistoryQueryKey = (page: number, limit: number, status?: StudentSubscriptionHistoryStatus) => ["student-subscription-history", page, limit, status || "all"] as const;
export const studentSubscriptionApi = {
  get: async (): Promise<StudentSubscriptionsData> => {
    const response = await apiRequest<StudentSubscriptionsEnvelope>("/students/me/subscription");
    return { subscription: response.data.subscription ?? null, subscriptions: Array.isArray(response.data.subscriptions) ? response.data.subscriptions : [] };
  },
  getHistory: async ({ page, limit, status }: { page: number; limit: number; status?: StudentSubscriptionHistoryStatus }): Promise<StudentSubscriptionHistoryResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    return apiRequest<StudentSubscriptionHistoryResponse>(`/students/me/subscriptions/history?${params.toString()}`);
  },
};
