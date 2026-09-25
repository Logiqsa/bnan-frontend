import type { CourseMode } from "@/api/coursesApi";
import type { GulfPaymentProvider } from "@/api/types";

const DRAFT_KEY = "bnan_gulf_payment_draft";
const LEGACY_DRAFT_KEY = "bnan_tamara_payment_draft";

interface PaymentDraftBase {
  paymentId: string;
  provider: GulfPaymentProvider;
  checkoutUrl: string;
  createdAt: string | number;
}

export type PaymentPurpose = "registration" | "subject_request" | "renewal" | "course_enrollment";

export interface RegistrationPaymentDraft extends PaymentDraftBase {
  purpose: "registration";
  idempotencyKey?: string;
  studentEmail?: string;
}

export interface SubjectRequestPaymentDraft extends PaymentDraftBase {
  purpose: "subject_request";
}

export interface RenewalPaymentDraft extends PaymentDraftBase {
  purpose: "renewal";
}

export interface CourseEnrollmentPaymentDraft extends PaymentDraftBase {
  purpose: "course_enrollment";
  courseId: string;
  mode: CourseMode;
  enrollmentId?: string;
}

export type GulfPaymentDraft = RegistrationPaymentDraft | SubjectRequestPaymentDraft | RenewalPaymentDraft | CourseEnrollmentPaymentDraft;

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const validString = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const validCreatedAt = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0)
  || (validString(value) && Number.isFinite(Date.parse(value)));
const RENEWAL_DRAFT_KEYS = new Set(["purpose", "paymentId", "provider", "checkoutUrl", "createdAt"]);
const COURSE_ENROLLMENT_DRAFT_KEYS = new Set(["purpose", "paymentId", "provider", "checkoutUrl", "createdAt", "courseId", "mode", "enrollmentId"]);

export const isPaymentDraft = (value: unknown): value is GulfPaymentDraft => {
  if (!isRecord(value)) return false;
  if (value.purpose !== "registration" && value.purpose !== "subject_request" && value.purpose !== "renewal" && value.purpose !== "course_enrollment") return false;
  if (!validString(value.paymentId) || !["tamara", "paymob"].includes(String(value.provider))) return false;
  if (typeof value.checkoutUrl !== "string" || !validCreatedAt(value.createdAt)) return false;
  if (value.purpose === "registration") {
    if (value.idempotencyKey !== undefined && !validString(value.idempotencyKey)) return false;
    if (value.studentEmail !== undefined && !validString(value.studentEmail)) return false;
  }
  if (value.purpose === "renewal" && Object.keys(value).some((key) => !RENEWAL_DRAFT_KEYS.has(key))) return false;
  if (value.purpose === "course_enrollment") {
    if (!validString(value.courseId) || !["group", "individual"].includes(String(value.mode))) return false;
    if (value.enrollmentId !== undefined && !validString(value.enrollmentId)) return false;
    if (Object.keys(value).some((key) => !COURSE_ENROLLMENT_DRAFT_KEYS.has(key))) return false;
  }
  return true;
};

export const gulfPaymentDraftStore = {
  save: (draft: GulfPaymentDraft) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  },
  read: (): GulfPaymentDraft | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        return isPaymentDraft(parsed) ? parsed : null;
      }
      const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
      if (!legacy) return null;
      const parsed: unknown = JSON.parse(legacy);
      if (!isRecord(parsed)) return null;
      const migrated = { ...parsed, provider: "tamara", checkoutUrl: "", purpose: "registration" };
      return isPaymentDraft(migrated) ? migrated : null;
    } catch {
      return null;
    }
  },
  clear: () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(LEGACY_DRAFT_KEY);
  },
  saveSubjectRequest: (draft: Omit<SubjectRequestPaymentDraft, "purpose">) => {
    gulfPaymentDraftStore.save({ ...draft, purpose: "subject_request" });
  },
  saveRenewal: (draft: Omit<RenewalPaymentDraft, "purpose">) => {
    gulfPaymentDraftStore.save({ ...draft, purpose: "renewal" });
  },
  saveCourseEnrollment: (draft: Omit<CourseEnrollmentPaymentDraft, "purpose">) => {
    gulfPaymentDraftStore.save({ ...draft, purpose: "course_enrollment" });
  },
};
