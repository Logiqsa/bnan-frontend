import { apiRequest } from "./client";
import type { TamaraCheckoutBody } from "./types";

export interface TamaraCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
  orderId: string;
  status: string;
}

export interface TamaraStatusResult {
  paymentId: string;
  status: "pending" | "authorized" | "captured" | "completed" | "failed" | "cancelled" | "expired" | "refunded" | string;
  checkoutUrl?: string;
  providerStatus?: string;
  studentId?: string;
  subscriptionId?: string;
  completedAt?: string;
}

export const paymentApi = {
  tamaraCheckout: (body: TamaraCheckoutBody, idempotencyKey: string) =>
    apiRequest<{ success: true; data: TamaraCheckoutResult }>("/payment/tamara/checkout", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  status: (paymentId: string) =>
    apiRequest<{ success: true; data: TamaraStatusResult }>(`/payment/tamara/${paymentId}/status`),
  reconcile: (paymentId: string) =>
    apiRequest<{ success: true; data: TamaraStatusResult }>(`/payment/tamara/${paymentId}/reconcile`, {
      method: "POST",
    }),
};
