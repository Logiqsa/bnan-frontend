import type { GulfPaymentProvider } from "@/api/types";

const DRAFT_KEY = "bnan_gulf_payment_draft";
const LEGACY_DRAFT_KEY = "bnan_tamara_payment_draft";

export interface GulfPaymentDraft {
  paymentId: string;
  provider: GulfPaymentProvider;
  checkoutUrl: string;
  purpose: "registration";
  idempotencyKey: string;
  studentEmail: string;
  createdAt: string;
}

export const gulfPaymentDraftStore = {
  save: (draft: GulfPaymentDraft) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  },
  read: (): GulfPaymentDraft | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw) as GulfPaymentDraft;
      const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
      if (!legacy) return null;
      const parsed = JSON.parse(legacy) as Omit<GulfPaymentDraft, "provider" | "checkoutUrl" | "purpose">;
      return { ...parsed, provider: "tamara", checkoutUrl: "", purpose: "registration" };
    } catch {
      return null;
    }
  },
  clear: () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  },
};
