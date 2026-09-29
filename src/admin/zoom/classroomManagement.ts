import type { ClassroomOption } from "@/api/classroomRecordingsApi";
import { hasCompleteZoomMeeting, normalizeZoomState } from "./classroomZoomNormalization";

export const CLASSROOM_DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;
export const CLASSROOM_DAY_NAMES: Record<string, string> = {
  saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
  wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة",
};

export const formatScheduleTimeParts = (value: string, isArabic = true) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return { clock: value, period: "" };
  const hours = Number(match[1]);
  if (hours < 0 || hours > 24 || (hours === 24 && match[2] !== "00")) return { clock: value, period: "" };
  const normalizedHours = hours === 24 ? 0 : hours;
  const period = normalizedHours < 12 ? (isArabic ? "صباحا" : "AM") : (isArabic ? "مساءا" : "PM");
  const displayHours = normalizedHours % 12 || 12;
  return { clock: `${displayHours}:${match[2]}`, period };
};

export const formatScheduleTime = (value: string, isArabic = true) => {
  const { clock, period } = formatScheduleTimeParts(value, isArabic);
  return period ? `${clock} ${period}` : clock;
};

export const sortClassroomsNewestFirst = (items: ClassroomOption[]) => [...items].sort((a, b) => {
  const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
  const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
  return bTime - aTime;
});

export const classroomZoomLabel = (item: ClassroomOption) => {
  const status = normalizeZoomState(item).provisioningStatus;
  if (status === "creating") return "جاري إنشاء Zoom";
  if (status === "failed") return "فشل إنشاء Zoom";
  if (item.zoomAssignmentMode === "grade_default") return "ربط تلقائي";
  return hasCompleteZoomMeeting(item) ? "Zoom جاهز" : "Zoom غير مربوط";
};
