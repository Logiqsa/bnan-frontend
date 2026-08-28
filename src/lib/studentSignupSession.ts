export const STUDENT_SIGNUP_DRAFT_KEY = "bnan_student_signup_draft";
const PAYMENT_CREDENTIALS_KEY = "bnan_payment_student_credentials";

interface StoredSignupCredentials {
  studentEmail?: string;
  studentPassword?: string;
}

export const studentSignupSession = {
  savePaymentCredentials: (paymentId: string, email: string, password: string) => {
    sessionStorage.setItem(PAYMENT_CREDENTIALS_KEY, JSON.stringify({ paymentId, email, password }));
  },
  credentials: (paymentId: string): { email: string; password: string } | null => {
    try {
      const paymentRaw = sessionStorage.getItem(PAYMENT_CREDENTIALS_KEY);
      if (paymentRaw) {
        const saved = JSON.parse(paymentRaw) as { paymentId?: string; email?: string; password?: string };
        if (saved.paymentId !== paymentId) return null;
        return saved.email && saved.password ? { email: saved.email, password: saved.password } : null;
      }

      // توافق مؤقت مع المحاولات التي بدأت قبل إضافة التخزين المرتبط بالدفع.
      const raw = sessionStorage.getItem(STUDENT_SIGNUP_DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw) as StoredSignupCredentials;
      return draft.studentEmail && draft.studentPassword
        ? { email: draft.studentEmail, password: draft.studentPassword }
        : null;
    } catch {
      return null;
    }
  },
  clear: () => {
    sessionStorage.removeItem(STUDENT_SIGNUP_DRAFT_KEY);
    sessionStorage.removeItem(PAYMENT_CREDENTIALS_KEY);
  },
};
