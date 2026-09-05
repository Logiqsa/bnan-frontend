import { apiRequest } from "./client";

export interface EgyptianRegistrationPayment {
  id?: string;
  status: "pending" | "confirmed" | "failed" | string;
  amount?: number | null;
  currency?: string;
  method?: string | null;
  referenceNumber?: string | null;
  receiptImage?: string | null;
  confirmedAt?: string | null;
  notes?: string | null;
}

export interface EgyptianRegistrationRequest {
  studentId: string;
  userId?: string;
  studentName?: string;
  fullName?: string;
  email?: string;
  parentName?: string | null;
  parentPhone?: string | null;
  registrationDate?: string;
  registrationStatus: "pending" | "approved" | "rejected";
  accountStatus?: string;
  curriculum?: string | { id?: string; name?: string };
  grade?: string | { id?: string; name?: string };
  subjects?: Array<string | { id?: string; name?: string }>;
  paymentStatus?: string;
  payment?: EgyptianRegistrationPayment | null;
  reviewedAt?: string | null;
}

interface RegistrationRequestsResponse {
  success: true;
  data: EgyptianRegistrationRequest[];
}

export const egyptianRegistrationRequestsApi = {
  findByUser: async (user: {
    id: string;
    email?: string;
    fullName?: string;
  }) => {
    const keyword = user.email || user.fullName || user.id;
    const params = new URLSearchParams({
      status: "all",
      page: "1",
      limit: "100",
      keyword,
    });
    const result = await apiRequest<RegistrationRequestsResponse>(
      `/admin/egyptian-registration-requests?${params.toString()}`,
    );
    return (
      result.data.find(
        (request) =>
          request.userId === user.id ||
          (user.email &&
            request.email?.toLowerCase() === user.email.toLowerCase()),
      ) || (result.data.length === 1 ? result.data[0] : null)
    );
  },
  confirmPayment: (studentId: string, receipt?: File) => {
    const body = receipt ? new FormData() : undefined;
    if (body) {
      body.append("receiptImage", receipt);
      body.append("method", "bank_transfer");
    }
    return apiRequest<{
      success: true;
      data: { payment: EgyptianRegistrationPayment };
    }>(`/admin/egyptian-registration-requests/${studentId}/payment`, {
      method: "PATCH",
      ...(body ? { body } : { body: JSON.stringify({}) }),
    });
  },
  approve: (studentId: string) =>
    apiRequest<{
      success: true;
      data: { student: EgyptianRegistrationRequest };
    }>(`/admin/egyptian-registration-requests/${studentId}/approve`, {
      method: "PATCH",
    }),
};
