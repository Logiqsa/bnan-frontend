import { API_BASE_URL, ApiError } from "@/api/client";
import type { Course, EnrollmentStatus, NamedRef } from "@/api/coursesApi";

const terminalEnrollmentStatuses = new Set<EnrollmentStatus>([
  "completed",
  "cancelled",
  "refunded",
  "expired",
  "removed",
]);

export const canRepurchaseCourseEnrollment = (status: EnrollmentStatus) =>
  terminalEnrollmentStatuses.has(status);

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
  COURSE_GROUP_CAPACITY_INVALID: "سعة المجموعة غير صالحة.", COURSE_GROUP_CAPACITY_BELOW_CURRENT: "لا يمكن جعل السعة أقل من عدد الطلاب الحالي في إحدى المجموعات.",
  COURSE_GROUP_FULL: "المجموعة ممتلئة.", COURSE_GROUP_MOVE_INVALID: "لا يمكن نقل هذا التسجيل بين المجموعتين.",
  COURSE_GROUP_HAS_ENROLLMENTS: "توجد تسجيلات نشطة في هذه المجموعة.",
  COURSE_CLASSROOM_NOT_FOUND: "فصل الدورة غير متاح.", DUPLICATED_SCHEDULE_SLOT: "يوجد موعد مكرر.", END_TIME_MUST_BE_AFTER_START: "وقت النهاية يجب أن يكون بعد البداية.",
  COURSE_SCHEDULE_LEGACY_SLOT_IDS_REQUIRED: "هذا الجدول قديم ويحتاج إلى ترقية بيانات منظّمة قبل تعديله. يمكنك عرضه الآن، لكن لا يمكن حفظ تغييرات عليه.",
  COURSE_SCHEDULE_CONCURRENT_UPDATE: "عدّل مستخدم آخر هذا الجدول في الوقت نفسه. راجع أحدث نسخة قبل إعادة تطبيق تغييراتك.",
  COURSE_SCHEDULE_SLOT_ID_INVALID: "تعذر حفظ الجدول لأن معرّف أحد المواعيد غير صالح.",
  COURSE_SCHEDULE_SLOT_ID_DUPLICATE: "تعذر حفظ الجدول لأن معرّف موعد مكرر داخل الطلب.",
  COURSE_SCHEDULE_SLOT_ID_UNKNOWN: "تعذر حفظ الجدول لأن أحد المواعيد لا ينتمي إلى النسخة الحالية من الجدول.",
  COURSE_SCHEDULE_SLOT_ID_FOREIGN: "تعذر حفظ الجدول لأن أحد معرّفات المواعيد يخص جدولًا آخر.",
  COURSE_SCHEDULE_SLOT_IDENTITY_AMBIGUOUS: "تعذر تحديد المواعيد التي تغيرت بأمان. راجع أحدث نسخة قبل المحاولة مجددًا.",
  COURSE_SCHEDULE_SLOT_ID_NOT_ALLOWED_FOR_NEW_SCHEDULE: "لا يمكن إرسال معرّف موعد موجود عند إنشاء جدول جديد.",
  WEEKLY_ZOOM_ASSIGNMENT_PENDING: "يجري تخصيص حساب Zoom لهذا الموعد. حدّث الصفحة بعد قليل ثم حاول مرة أخرى.",
  WEEKLY_ZOOM_ASSIGNMENT_UNALLOCATED: "لا يوجد حساب Zoom متاح لهذا الموعد حاليًا.",
  WEEKLY_ZOOM_ASSIGNMENT_STALE: "تغيّر الجدول أثناء التجهيز. حدّث الصفحة ثم حاول مرة أخرى.",
  WEEKLY_ZOOM_ASSIGNMENT_AMBIGUOUS: "تعذر تحديد إعداد Zoom لهذا الموعد بأمان. تواصل مع الإدارة.",
  WEEKLY_ZOOM_ASSIGNMENT_CANCELLED: "تم إلغاء إعداد Zoom لهذا الموعد.",
  WEEKLY_ZOOM_ASSIGNMENT_QUARANTINED: "توقف إعداد Zoom لهذا الموعد للتحقق الآمن. تواصل مع الإدارة.",
  WEEKLY_ZOOM_ASSIGNMENT_MIGRATION_REQUIRED: "هذا الموعد القديم يحتاج إلى ترحيل منظّم قبل استخدام Zoom الجديد.",
  WEEKLY_ZOOM_HOST_BUSY: "حساب Zoom المستخدم مشغول بحصة أخرى. حاول مرة أخرى بعد قليل.",
  WEEKLY_ZOOM_HOST_UNAVAILABLE: "لا يمكن تأكيد توفر حساب Zoom لهذا الموعد حاليًا.",
  WEEKLY_ZOOM_OCCURRENCE_NOT_MATERIALIZED: "الحصة قيد التجهيز ولم تصبح متاحة للبدء بعد.",
  WEEKLY_ZOOM_OCCURRENCE_AMBIGUOUS: "تعذر مطابقة الحصة بموعدها الأسبوعي بأمان.",
  PAYROLL_STATEMENT_EXISTS: "يوجد بالفعل كشف مستحقات لهذا المعلم خلال هذه الفترة.",
  PAYROLL_STATEMENT_PERIOD_OVERLAP: "الفترة المحددة متداخلة مع كشف مستحقات موجود لهذا المعلم.",
  PAYROLL_STATEMENT_PAID: "لا يمكن حذف كشف تم صرفه بالفعل.",
  PAYROLL_STATEMENT_NOT_EDITABLE: "لا يمكن تعديل أو إعادة إرسال كشف تم إرساله أو صرفه بالفعل.",
};
export const courseError = (value: unknown) => { const e = value as ApiError; return errors[e?.code] || e?.message || "حدث خطأ غير متوقع."; };
