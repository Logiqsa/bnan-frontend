import { API_BASE_URL, ApiError } from "@/api/client";
import type { Course, NamedRef } from "@/api/coursesApi";

export const isFreeCourse = (course: Course) =>
  course.enrollmentModes.group.enabled &&
  Number(course.enrollmentModes.group.price) === 0 &&
  !course.enrollmentModes.individual.enabled;

export const refId = (value?: string | NamedRef | null) => typeof value === "string" ? value : value?.id || value?._id || "";
export const refName = (value?: string | NamedRef | null) => {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (typeof value.user === "object") return value.user.fullName || value.user.email || value.name || "—";
  return value.fullName || value.name || "—";
};
export const courseImageUrl = (value?: string) => {
  if (!value) return "";
  if (/^https?:\/\//.test(value)) return value;
  return `${API_BASE_URL.replace(/\/api\/v1$/, "")}/${value.replace(/^\//, "")}`;
};
const errors: Record<string,string> = {
  COURSE_ENROLLMENT_CLOSED: "التسجيل في هذه الدورة مغلق.", COURSE_ENROLLMENT_MODE_DISABLED: "نمط التسجيل المحدد غير متاح.",
  STUDENT_GRADE_NOT_ELIGIBLE_FOR_COURSE: "صف الطالب غير مؤهل لهذه الدورة.", COURSE_PAYMENT_REQUIRED: "تتطلب هذه الدورة الدفع أولاً.",
  COURSE_PAYMENT_NOT_REQUIRED: "هذه الدورة مجانية ولا تحتاج إلى دفع.", COURSE_GRADES_MUST_SHARE_CURRICULUM: "يجب أن تنتمي الصفوف المؤهلة إلى منهج واحد.",
  INVALID_ELIGIBLE_GRADE: "أحد الصفوف المحددة غير صالح.", COURSE_ELIGIBLE_GRADES_REQUIRED: "اختر صفًا مؤهلًا واحدًا على الأقل.",
  COURSE_ENROLLMENT_MODE_REQUIRED: "فعّل التسجيل الجماعي أو الفردي على الأقل.", SUPERVISOR_CURRICULUM_MISMATCH: "المشرف لا ينتمي إلى منهج الصفوف المحددة.",
  COURSE_STAFF_NOT_ACTIVE: "يجب أن يكون المعلم والمشرف نشطين.", COURSE_SCHEDULE_ACCESS_DENIED: "لا تملك صلاحية تعديل هذا الجدول.",
  COURSE_CLASSROOM_NOT_FOUND: "فصل الدورة غير متاح.", DUPLICATED_SCHEDULE_SLOT: "يوجد موعد مكرر.", END_TIME_MUST_BE_AFTER_START: "وقت النهاية يجب أن يكون بعد البداية.",
};
export const courseError = (value: unknown) => { const e = value as ApiError; return errors[e?.code] || e?.message || "حدث خطأ غير متوقع."; };
