import type { CourseMode } from "@/api/coursesApi";
import type { GulfPaymentProvider } from "@/api/types";

const STORAGE_KEY = "bnan_course_registration_intent";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ALLOWED_KEYS = new Set([
  "courseId",
  "mode",
  "provider",
  "returnTo",
  "createdAt",
  "expectedStudentUserId",
  "paymentStarted",
]);

export interface CourseRegistrationIntent {
  courseId: string;
  mode: CourseMode;
  provider: GulfPaymentProvider;
  returnTo: string;
  createdAt: number;
  expectedStudentUserId?: string;
  paymentStarted?: boolean;
}

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const safeReturnTo = (value: unknown) => {
  const path = stringValue(value);
  return path.startsWith("/courses/") && !path.startsWith("//") ? path : "";
};

export const isCourseRegistrationIntent = (
  value: unknown,
): value is CourseRegistrationIntent => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const intent = value as Record<string, unknown>;
  return Boolean(
    Object.keys(intent).every((key) => ALLOWED_KEYS.has(key))
      &&
    stringValue(intent.courseId)
      && ["group", "individual"].includes(String(intent.mode))
      && ["paymob", "tamara"].includes(String(intent.provider))
      && safeReturnTo(intent.returnTo)
      && typeof intent.createdAt === "number"
      && Number.isFinite(intent.createdAt)
      && intent.createdAt <= Date.now()
      && Date.now() - intent.createdAt <= MAX_AGE_MS
      && (intent.expectedStudentUserId === undefined || stringValue(intent.expectedStudentUserId))
      && (intent.paymentStarted === undefined || typeof intent.paymentStarted === "boolean"),
  );
};

export const canResumeCourseRegistration = (
  intent: CourseRegistrationIntent,
  courseId: string,
  studentUserId: string,
) => !intent.paymentStarted
  && intent.courseId === courseId
  && Boolean(intent.expectedStudentUserId)
  && intent.expectedStudentUserId === studentUserId;

const persist = (intent: CourseRegistrationIntent) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // Registration can continue in the current page when storage is unavailable.
  }
  return intent;
};

export const courseRegistrationIntentStore = {
  save: (intent: Omit<CourseRegistrationIntent, "createdAt">) =>
    persist({ ...intent, createdAt: Date.now() }),
  read: (): CourseRegistrationIntent | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (isCourseRegistrationIntent(value)) return value;
    } catch {
      // Invalid or unavailable storage must not resume a registration.
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else can be done when browser storage is unavailable.
    }
    return null;
  },
  bindStudent: (studentUserId: string) => {
    const intent = courseRegistrationIntentStore.read();
    if (!intent || !stringValue(studentUserId)) return null;
    return persist({ ...intent, expectedStudentUserId: studentUserId });
  },
  markPaymentStarted: () => {
    const intent = courseRegistrationIntentStore.read();
    if (!intent) return null;
    return persist({ ...intent, paymentStarted: true });
  },
  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else can be done when browser storage is unavailable.
    }
  },
};
