import type { ClassroomOption } from "@/api/classroomRecordingsApi";
import type { ClassroomScheduleEntry } from "@/api/classroomZoomApi";
import { hasCompleteZoomMeeting, normalizeZoomState } from "./classroomZoomNormalization";

export const CLASSROOM_DAYS = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;
export const CLASSROOM_DAY_NAMES: Record<string, string> = {
  saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
  wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة",
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

export const normalizeEgyptianSchedule = (data: {
  days?: Array<{ dayName: string; lessons?: Array<{ startTime: string; endTime?: string; subject?: { name?: string | { ar?: string; en?: string } } }> }>;
}): ClassroomScheduleEntry[] => (data.days || []).flatMap((day) => (day.lessons || []).map((lesson) => ({
  day: day.dayName,
  startTime: lesson.startTime,
  ...(lesson.endTime ? { endTime: lesson.endTime } : {}),
  subjectName: typeof lesson.subject?.name === "string" ? lesson.subject.name : lesson.subject?.name?.ar || lesson.subject?.name?.en,
})));

export const normalizeGulfSchedule = (data: {
  schedule?: { entries?: ClassroomScheduleEntry[] } | ClassroomScheduleEntry[];
  subject?: { name?: string | { ar?: string; en?: string } };
}): ClassroomScheduleEntry[] => {
  const entries = Array.isArray(data.schedule) ? data.schedule : data.schedule?.entries || [];
  const subjectName = typeof data.subject?.name === "string" ? data.subject.name : data.subject?.name?.ar || data.subject?.name?.en;
  return entries.map((entry) => ({ ...entry, subjectName: entry.subjectName || subjectName }));
};
