const DRAFT_KEY = "bnan_tamara_payment_draft";

export interface TamaraDraft {
  paymentId: string;
  idempotencyKey: string;
  studentEmail: string;
  createdAt: string;
}

export const tamaraDraftStore = {
  save: (draft: TamaraDraft) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  },
  read: (): TamaraDraft | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? (JSON.parse(raw) as TamaraDraft) : null;
    } catch {
      return null;
    }
  },
  clear: () => {
    localStorage.removeItem(DRAFT_KEY);
  },
};
