import { apiRequest } from "@/api/client";
import type { GulfPaymentProvider, TamaraPaymentAddress } from "@/api/types";

export interface AvailableSubject {
  id: string;
  name: string;
  isSelectable: boolean;
  requestStatus: string | null;
}

export interface AvailableSubjectsResult {
  curriculum: { id: string; name: string; registrationMode: "egyptian" | "gulf" };
  grade: { id: string; name: string };
  subjects: AvailableSubject[];
}

export interface SubjectRequestCheckoutBody {
  subjectId: string;
  packageId: string;
  provider: GulfPaymentProvider;
  notes?: string;
  discountCode?: string;
  paymentAddress?: TamaraPaymentAddress;
  locale?: "ar_SA" | "en_US";
  isMobile?: false;
}

export interface SubjectRequestCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  orderId?: string;
  status: string;
  providerStatus?: string;
  originalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  currency?: string;
  discount?: unknown;
}

export interface DirectSubjectRequestBody {
  subjectIds: [string];
  packageId: string;
  notes?: string;
}

export interface DirectSubjectRequestResult {
  subjectRequestId: string;
  subject: { id: string; name: string };
  status: string;
  notes?: string | null;
  requestedAt?: string;
}

export interface SubjectRequestPaymentStatus {
  paymentId: string;
  status: string;
  providerStatus?: string;
  checkoutUrl?: string;
  completedAt?: string;
}

interface StatusEnvelope { success: true; data: SubjectRequestPaymentStatus; }
interface AvailableSubjectsEnvelope { success: true; data: AvailableSubjectsResult; }
interface CheckoutEnvelope { success: true; data: SubjectRequestCheckoutResult; }
interface DirectRequestEnvelope { success: true; results: number; data: DirectSubjectRequestResult[]; }

export const studentAvailableSubjectsQueryKey = ["student-available-subjects"] as const;
export const studentSubjectPackagesQueryKey = (curriculumId: string) => ["student-subject-packages", curriculumId] as const;

export const studentSubjectRequestsApi = {
  availableSubjects: async () => (await apiRequest<AvailableSubjectsEnvelope>("/gulf-student-subject-requests/available-subjects")).data,
  requestAdditional: async (body: DirectSubjectRequestBody) => (await apiRequest<DirectRequestEnvelope>("/gulf-student-subject-requests", {
    method: "POST",
    body: JSON.stringify(body),
  })).data,
  checkout: async (body: SubjectRequestCheckoutBody, idempotencyKey: string) => (await apiRequest<CheckoutEnvelope>("/gulf-student-subject-requests/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Idempotency-Key": idempotencyKey },
  })).data,
  checkoutStatus: async (paymentId: string) => (await apiRequest<StatusEnvelope>(`/gulf-student-subject-requests/checkout/${encodeURIComponent(paymentId)}/status`)).data,
  reconcileCheckout: async (paymentId: string) => (await apiRequest<StatusEnvelope>(`/gulf-student-subject-requests/checkout/${encodeURIComponent(paymentId)}/reconcile`, { method: "POST" })).data,
};
