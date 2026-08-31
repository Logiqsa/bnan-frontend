import type { ZoomAccountClassroom } from "@/api/zoomAccountsApi";

export const DAY_ORDER = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

export const DAY_NAMES: Record<string, string> = {
  saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
  wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة",
};

export type UsageFilter = "all" | "manual" | "grade_default" | "active" | "inactive";

export const getMeetingStatus = (classroom: ZoomAccountClassroom) => {
  if (classroom.zoomProvisioning?.status === "creating") return "creating" as const;
  if (classroom.zoomProvisioning?.status === "failed") return "failed" as const;
  if (classroom.zoomMeetingId && classroom.meetingLink) return "ready" as const;
  return "not_ready" as const;
};

export const filterUsageClassrooms = (classrooms: ZoomAccountClassroom[], filter: UsageFilter) => classrooms.filter((classroom) => {
  if (filter === "manual" || filter === "grade_default") return classroom.zoomAssignmentMode === filter;
  if (filter === "active") return classroom.isActive;
  if (filter === "inactive") return !classroom.isActive;
  return true;
});

export interface TimelineEntry {
  classroomId: string;
  classroomName: string;
  gradeName: string;
  day: string;
  startTime: string;
  endTime: string | null;
  subjectName: string;
}

export const buildUsageTimeline = (classrooms: ZoomAccountClassroom[]) => {
  const groups = new Map<string, TimelineEntry[]>();
  classrooms.forEach((classroom) => (classroom.schedule || []).forEach((entry) => {
    const entries = groups.get(entry.day) || [];
    entries.push({
      classroomId: classroom.id,
      classroomName: classroom.name,
      gradeName: classroom.grade?.name || "بدون صف",
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectName: entry.subjectName,
    });
    groups.set(entry.day, entries);
  }));
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      const aIndex = DAY_ORDER.indexOf(a);
      const bIndex = DAY_ORDER.indexOf(b);
      return (aIndex < 0 ? DAY_ORDER.length : aIndex) - (bIndex < 0 ? DAY_ORDER.length : bIndex);
    })
    .map(([day, entries]) => ({ day, entries: entries.sort((a, b) => a.startTime.localeCompare(b.startTime)) }));
};
