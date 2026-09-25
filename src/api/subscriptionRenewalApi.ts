import { apiRequest } from "@/api/client";
import type { GulfPaymentProvider } from "@/api/types";

export type EgyptianRenewalStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "rejected";

export type GulfRenewalStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type EgyptianRenewalMethod =
  | "cash"
  | "bank_transfer"
  | "instapay"
  | "wallet"
  | "other";

export interface EgyptianRenewalRequest {
  studentId?: string;
  subscriptionId?: string;
  packageId: string;
  subjectId?: string;
  discountCode?: string;
  method?: EgyptianRenewalMethod;
  referenceNumber?: string;
}

export type RenewalEntityReference =
  | string
  | ({ id?: string } & Record<string, unknown>)
  | null;

export interface EgyptianRenewalResult {
  id?: string;
  paymentId: string;
  purpose: "renewal";
  package: RenewalEntityReference;
  subject?: RenewalEntityReference;
  subscriptionId?: string | null;
  amount: number;
  originalAmount: number;
  discountAmount: number;
  currency: "EGP";
  method: EgyptianRenewalMethod;
  referenceNumber?: string | null;
  status: EgyptianRenewalStatus;
  confirmedAt?: string | null;
  rejectionReason?: string | null;
  payment: Record<string, unknown>;
  subscription?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EgyptianRenewalResponse {
  success: true;
  data: EgyptianRenewalResult;
}

export interface GulfRenewalRequest {
  studentId?: string;
  subscriptionId?: string;
  packageId: string;
  subjectId?: string;
  discountCode?: string;
  provider?: GulfPaymentProvider;
  paymentAddress?: GulfRenewalPaymentAddress;
  locale?: string;
  isMobile?: boolean;
}

export interface GulfRenewalPaymentAddress {
  city: string;
  region: string;
  line1: string;
  line2?: string | null;
}

export interface GulfCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  orderId?: string | null;
  status: GulfRenewalStatus;
  providerStatus?: string | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  discount?: Record<string, unknown> | null;
}

export interface GulfCheckoutResponse {
  success: true;
  data: GulfCheckoutResult;
}

export interface GulfRenewalStatusResult {
  paymentId: string;
  status: GulfRenewalStatus;
  checkoutUrl?: string;
  providerStatus?: string | null;
  studentId?: string;
  subscriptionId?: string;
  subjectRequestId?: string;
  completedAt?: string | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  discount?: Record<string, unknown> | null;
}

export interface GulfStatusResponse {
  success: true;
  data: GulfRenewalStatusResult;
}

export type GulfReconcileResponse = GulfStatusResponse;

export const subscriptionRenewalApi = {
  createEgyptianRenewal: async (body: EgyptianRenewalRequest) =>
    (
      await apiRequest<EgyptianRenewalResponse>(
        "/subscription-renewals/egyptian",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      )
    ).data,

  getEgyptianRenewalStatus: async (paymentId: string) =>
    (
      await apiRequest<EgyptianRenewalResponse>(
        `/subscription-renewals/egyptian/${encodeURIComponent(paymentId)}/status`,
      )
    ).data,

  createGulfRenewal: async (
    body: GulfRenewalRequest,
    idempotencyKey: string,
  ) =>
    (
      await apiRequest<GulfCheckoutResponse>("/subscription-renewals/gulf", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Idempotency-Key": idempotencyKey },
      })
    ).data,

  getGulfRenewalStatus: async (paymentId: string) =>
    (
      await apiRequest<GulfStatusResponse>(
        `/subscription-renewals/gulf/${encodeURIComponent(paymentId)}/status`,
      )
    ).data,

  reconcileGulfRenewal: async (paymentId: string) =>
    (
      await apiRequest<GulfReconcileResponse>(
        `/subscription-renewals/gulf/${encodeURIComponent(paymentId)}/reconcile`,
        { method: "POST" },
      )
    ).data,
};
