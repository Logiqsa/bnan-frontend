import { apiRequest } from "./client";
import type { GulfCheckoutBody, GulfPaymentProvider } from "./types";

export interface GulfCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  orderId: string;
  status: string;
}

export interface GulfPaymentStatusResult {
  paymentId: string;
  status: "pending" | "authorized" | "captured" | "completed" | "failed" | "cancelled" | "expired" | "refunded" | string;
  checkoutUrl?: string;
  providerStatus?: string;
  studentId?: string;
  subscriptionId?: string;
  completedAt?: string;
}

export const paymentApi = {
  checkout: (body: GulfCheckoutBody, idempotencyKey: string) =>
    apiRequest<{ success: true; data: GulfCheckoutResult }>("/payment/checkout", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  status: (provider: GulfPaymentProvider, paymentId: string) =>
    apiRequest<{ success: true; data: GulfPaymentStatusResult }>(`/payment/${provider}/${paymentId}/status`),
  reconcile: (paymentId: string) =>
    apiRequest<{ success: true; data: GulfPaymentStatusResult }>(`/payment/tamara/${paymentId}/reconcile`, {
      method: "POST",
    }),
};
