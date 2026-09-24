import { apiRequest } from "@/api/client";
import type { AdminFinancialEntity, AdminPagination, AdminSubscriptionStudent } from "@/api/adminSubscriptionsApi";

export type AdminPaymentModel = "egyptian" | "gulf";
export interface AdminPaymentItem { id?: string; lineKey?: string; student?: { id?: string } | null; parent?: { id?: string } | null; package?: AdminFinancialEntity | null; subject?: AdminFinancialEntity | null; curriculum?: AdminFinancialEntity | null; packageType?: string | null; accessScope?: string | null; hours?: number | null; price?: number | null; currency?: string | null; originalAmount?: number | null; discountAmount?: number | null; finalAmount?: number | null; status?: string | null; subscription?: { id?: string } | null; fulfilledAt?: string | null; createdAt?: string; updatedAt?: string; }
export interface AdminPayment { id?: string; paymentModel?: "EgyptianPayment" | "Payment" | string; student?: AdminSubscriptionStudent | null; parent?: AdminSubscriptionStudent["parent"]; amount?: number | null; originalAmount?: number | null; discountAmount?: number | null; currency?: string | null; provider?: string | null; purpose?: string | null; status?: string | null; paymentStatus?: string | null; providerStatus?: string | null; providerOrderId?: string | null; providerCheckoutId?: string | null; providerPaymentId?: string | null; referenceNumber?: string | null; method?: string | null; receiptImage?: string | null; package?: AdminFinancialEntity | null; subject?: AdminFinancialEntity | null; course?: AdminFinancialEntity | null; courseEnrollment?: { id?: string } | null; subscription?: { id?: string } | null; requestedBy?: { id?: string; fullName?: string | null; email?: string | null } | null; confirmedBy?: { id?: string; fullName?: string | null; email?: string | null } | null; confirmedAt?: string | null; completedAt?: string | null; paidAt?: string | null; processedAt?: string | null; failureReason?: string | null; notes?: string | null; rejectionReason?: string | null; items?: AdminPaymentItem[]; createdAt?: string; updatedAt?: string; }
export interface AdminPaymentFilters { student?: string; parent?: string; provider?: string; status?: string; purpose?: string; paymentModel?: AdminPaymentModel; from?: string; to?: string; page?: number; limit?: number; }
interface PaymentListResponse { success: true; results: number; data: AdminPayment[]; pagination: AdminPagination; }
interface PaymentDetailResponse { success: true; data: AdminPayment; }

const queryString = (filters: AdminPaymentFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return query.toString();
};

export const adminPaymentsApi = {
  list: async (filters: AdminPaymentFilters = {}) => { const query = queryString(filters); return apiRequest<PaymentListResponse>(`/admin/payments${query ? `?${query}` : ""}`); },
  getById: async (id: string, paymentModel?: AdminPaymentModel) => {
    const suffix = paymentModel ? `?paymentModel=${paymentModel}` : "";
    return (await apiRequest<PaymentDetailResponse>(`/admin/payments/${encodeURIComponent(id)}${suffix}`)).data;
  },
};
