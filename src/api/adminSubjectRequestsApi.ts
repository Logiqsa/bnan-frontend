import { apiRequest } from "@/api/client";

export type AdminSubjectRequestStatus =
  | "awaiting_admin_approval"
  | "pending"
  | "assigned"
  | "rejected"
  | "cancelled";

export interface AdminSubjectRequestEntity {
  id?: string;
  name?: string | null;
}

export interface AdminSubjectRequest {
  id?: string;
  student?: { id?: string; user?: { id?: string; fullName?: string | null; email?: string | null } | null } | null;
  curriculum?: AdminSubjectRequestEntity | null;
  grade?: AdminSubjectRequestEntity | null;
  subject?: AdminSubjectRequestEntity | null;
  package?: AdminSubjectRequestEntity | null;
  notes?: string | null;
  status?: AdminSubjectRequestStatus | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface AdminSubjectRequestFilters {
  status?: AdminSubjectRequestStatus | string;
  page?: number;
  limit?: number;
}

export interface AdminSubjectRequestListResponse {
  success: true;
  results: number;
  data: AdminSubjectRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminSubjectRequestApprovalInput {
  receiptImage: File;
  amount?: number;
  method?: "cash" | "bank_transfer" | "instapay" | "wallet" | "other";
  referenceNumber?: string;
  paymentNotes?: string;
}

const queryString = (filters: AdminSubjectRequestFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
};

export const adminSubjectRequestsApi = {
  list: (filters: AdminSubjectRequestFilters = {}) => {
    const query = queryString(filters);
    return apiRequest<AdminSubjectRequestListResponse>(
      `/admin/subject-requests${query ? `?${query}` : ""}`,
    );
  },

  approve: (id: string, input: AdminSubjectRequestApprovalInput) => {
    const body = new FormData();
    body.append("receiptImage", input.receiptImage);
    if (input.amount !== undefined) body.append("amount", String(input.amount));
    if (input.method) body.append("method", input.method);
    if (input.referenceNumber?.trim()) body.append("referenceNumber", input.referenceNumber.trim());
    if (input.paymentNotes?.trim()) body.append("paymentNotes", input.paymentNotes.trim());

    return apiRequest<{ success: true; data: AdminSubjectRequest }>(
      `/admin/subject-requests/${encodeURIComponent(id)}/approve`,
      { method: "PATCH", body },
    );
  },

  reject: (id: string) =>
    apiRequest<{ success: true; data: AdminSubjectRequest }>(
      `/admin/subject-requests/${encodeURIComponent(id)}/reject`,
      { method: "PATCH" },
    ),
};
