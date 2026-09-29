import { apiRequest } from "./client";
import type { ActiveSession, PortalLesson, RegistrationMode } from "./types";

interface ScheduleWeekMetadata {
  currentWeek?: number | null;
  currentWeekStart?: string | null;
  weekStart: string;
  weekEnd?: string;
  timezone?: string;
}
interface StartResponse { success:true; data:{session:{id?:string;_id?:string}|null;meetingLink:string;teacherStartUrl?:string} }
interface JoinResponse { success:true; data:{meetingLink?:string;status?:string} }

export interface PortalScheduleWeek extends ScheduleWeekMetadata {
  lessons: PortalLesson[];
}

interface UnifiedScheduleEntry {
  id: string;
  type: "classroom" | "course";
  system: RegistrationMode;
  scheduleId?: string;
  classroom: { id: string; name: string };
  classroomSubjectId?: string | null;
  subject: { id: string; name: string } | null;
  teacher?: { id?: string; userId?: string; name?: string; fullName?: string } | null;
  day: string;
  date: string;
  startTime: string;
  endTime?: string;
  scheduledAt: string | null;
  activeSession?: PortalLesson["activeSession"] | null;
  courseId?: string;
  courseName?: string;
  courseGroupId?: string;
}
interface UnifiedScheduleResponse {
  data: ScheduleWeekMetadata & { days?: Array<{ date: string; day: string; lessons?: UnifiedScheduleEntry[] }> };
}
export interface UnifiedScheduleEntryInput {
  day: string;
  classroomSubjectId: string;
  startTime: string;
  endTime: string;
}

export interface ClassroomScheduleEntry {
  id?: string;
  day: string;
  startTime: string;
  endTime?: string;
  classroomSubjectId?: string;
  subjectName?: string;
}

export interface UnifiedClassroomSchedule extends ScheduleWeekMetadata {
  entries: ClassroomScheduleEntry[];
}

const toPortalLesson = (
  lesson: UnifiedScheduleEntry,
  day: { date: string; day: string },
): PortalLesson => ({
  key: `${lesson.type}-${lesson.id}-${lesson.date || day.date}`,
  lessonId:
    lesson.type === "classroom" && lesson.system === "egyptian"
      ? lesson.id
      : undefined,
  scheduleEntryId: lesson.type === "classroom" ? lesson.id : undefined,
  registrationMode: lesson.system,
  classroom: lesson.classroom,
  classroomSubjectId: lesson.classroomSubjectId || "",
  subject: lesson.subject || { id: "", name: lesson.courseName || "" },
  teacher: lesson.teacher || undefined,
  day: lesson.day || day.day,
  date: lesson.date || day.date,
  startTime: lesson.startTime,
  endTime: lesson.endTime,
  scheduledAt: lesson.scheduledAt,
  activeSession: lesson.activeSession || null,
  scheduleKind: lesson.type,
  courseName: lesson.courseName,
  courseId: lesson.courseId,
  courseGroupId: lesson.courseGroupId,
});

export async function getUnifiedScheduleWeek(
  weekStart: string,
  registrationMode?: RegistrationMode,
): Promise<PortalScheduleWeek> {
  const query = new URLSearchParams({ weekStart });
  if (registrationMode) query.set("registrationMode", registrationMode);
  const result = await apiRequest<UnifiedScheduleResponse>(`/schedules/mySchedule?${query.toString()}`);
  const lessons = (result.data.days || []).flatMap((day) =>
    (day.lessons || []).map((lesson) => toPortalLesson(lesson, day)),
  );
  return {
    currentWeek: result.data.currentWeek,
    currentWeekStart: result.data.currentWeekStart,
    weekStart: result.data.weekStart || weekStart,
    weekEnd: result.data.weekEnd,
    timezone: result.data.timezone,
    lessons,
  };
}

export async function getAdminScheduleWeek(
  weekStart: string,
  registrationMode?: RegistrationMode,
): Promise<PortalScheduleWeek> {
  const query = new URLSearchParams({ weekStart });
  if (registrationMode) query.set("registrationMode", registrationMode);
  const result = await apiRequest<UnifiedScheduleResponse>(
    `/schedules/adminSchedule?${query.toString()}`,
  );
  const lessons = (result.data.days || []).flatMap((day) =>
    (day.lessons || []).map((lesson) => toPortalLesson(lesson, day)),
  );
  return {
    currentWeek: result.data.currentWeek,
    currentWeekStart: result.data.currentWeekStart,
    weekStart: result.data.weekStart || weekStart,
    weekEnd: result.data.weekEnd,
    timezone: result.data.timezone,
    lessons,
  };
}

export async function getUnifiedClassroomSchedule(
  classroomId: string,
  weekStart?: string,
): Promise<UnifiedClassroomSchedule> {
  const query = weekStart ? `?${new URLSearchParams({ weekStart })}` : "";
  const result = await apiRequest<UnifiedScheduleResponse>(
    `/schedules/classroom/${encodeURIComponent(classroomId)}${query}`,
  );
  return {
    currentWeek: result.data.currentWeek,
    currentWeekStart: result.data.currentWeekStart,
    weekStart: result.data.weekStart,
    weekEnd: result.data.weekEnd,
    timezone: result.data.timezone,
    entries: (result.data.days || []).flatMap((day) =>
      (day.lessons || [])
        .filter((lesson) => lesson.type === "classroom")
        .map((lesson) => ({
          id: lesson.id,
          day: lesson.day || day.day,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          classroomSubjectId: lesson.classroomSubjectId || undefined,
          subjectName: lesson.subject?.name,
        })),
    ),
  };
}

export const upsertUnifiedScheduleEntry = (classroomId: string, entry: UnifiedScheduleEntryInput) =>
  apiRequest<{ success: true; data: { id: string; system: RegistrationMode; classroomId: string } }>(
    `/schedules/classroom/${encodeURIComponent(classroomId)}`,
    { method: "PUT", body: JSON.stringify(entry) },
  );

export const deleteUnifiedScheduleEntry = (classroomId: string, entryId: string) =>
  apiRequest<void>(`/schedules/classroom/${encodeURIComponent(classroomId)}/entries/${encodeURIComponent(entryId)}`, { method: "DELETE" });

const sameScheduleEntry = (
  left: ClassroomScheduleEntry,
  right: ClassroomScheduleEntry,
) =>
  left.day === right.day &&
  left.classroomSubjectId === right.classroomSubjectId &&
  left.startTime === right.startTime &&
  (left.endTime || "") === (right.endTime || "");

export async function reconcileUnifiedClassroomSchedule(
  classroomId: string,
  originalEntries: ClassroomScheduleEntry[],
  nextEntries: ClassroomScheduleEntry[],
) {
  const originalById = new Map(
    originalEntries.flatMap((entry) => (entry.id ? [[entry.id, entry] as const] : [])),
  );
  const nextIds = new Set(nextEntries.flatMap((entry) => (entry.id ? [entry.id] : [])));
  const replacementIds = new Set(
    nextEntries.flatMap((entry) => {
      const original = entry.id ? originalById.get(entry.id) : undefined;
      return original &&
        (original.day !== entry.day ||
          original.classroomSubjectId !== entry.classroomSubjectId)
        ? [entry.id]
        : [];
    }),
  );
  const deleteIds = originalEntries.flatMap((entry) =>
    entry.id && (!nextIds.has(entry.id) || replacementIds.has(entry.id))
      ? [entry.id]
      : [],
  );

  await Promise.all(
    deleteIds.map((entryId) => deleteUnifiedScheduleEntry(classroomId, entryId)),
  );

  const changedEntries = nextEntries.filter((entry) => {
    const original = entry.id ? originalById.get(entry.id) : undefined;
    return !original || replacementIds.has(entry.id || "") || !sameScheduleEntry(original, entry);
  });
  await Promise.all(
    changedEntries.map((entry) => {
      if (!entry.classroomSubjectId || !entry.endTime) {
        throw new Error("SCHEDULE_ENTRY_FIELDS_REQUIRED");
      }
      return upsertUnifiedScheduleEntry(classroomId, {
        day: entry.day,
        classroomSubjectId: entry.classroomSubjectId,
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
    }),
  );
}

export const startLesson = (lesson: PortalLesson) => apiRequest<StartResponse>(`/classrooms/${lesson.classroom.id}/sessions/start`, {
  method: "POST", body: JSON.stringify({
    subjectId: lesson.subject.id,
    ...(lesson.lessonId ? { lessonId: lesson.lessonId } : {}),
    occurrenceDate: lesson.date,
    classroomSubjectId: lesson.classroomSubjectId,
    scheduledStartTime: lesson.startTime,
  }),
});

export const startClassroomSession = (
  classroomId: string,
  session: Pick<ActiveClassroomSession, "classroomSubjectId" | "subjectId">,
) => apiRequest<StartResponse>(
  `/classrooms/${encodeURIComponent(classroomId)}/sessions/start`,
  {
    method: "POST",
    body: JSON.stringify({
      ...(session.subjectId ? { subjectId: session.subjectId } : {}),
      ...(session.classroomSubjectId
        ? { classroomSubjectId: session.classroomSubjectId }
        : {}),
    }),
  },
);

export const joinLesson = (classroomId: string) => apiRequest<JoinResponse>(`/classrooms/${classroomId}/sessions/active/join`);

export interface ActiveClassroomSession {
  sessionId: string | null;
  status: ActiveSession["status"] | "scheduled" | "completed" | "cancelled";
  teacher?: { id?: string; userId?: string; fullName?: string } | null;
  classroomId?: string;
  subjectId?: string;
  classroomSubjectId?: string;
  occurrenceKey?: string;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  actualStartedAt?: string | null;
  startAt?: string | null;
  startWindow?: { opensAt: string; closesAt: string } | null;
  startStatus?: "NOT_OPEN" | "AVAILABLE" | "CLOSED";
  canStart?: boolean;
  canJoin?: boolean;
}

export const getActiveClassroomSession = async (classroomId: string) => {
  const response = await apiRequest<{ success: true; data: ActiveClassroomSession | null }>(
    `/classrooms/${encodeURIComponent(classroomId)}/sessions/active`,
  );
  return response.data;
};

export const endSession = async (sessionId: string) => {
  const response = await apiRequest<{
    success: true;
    data: { _id?: string; id?: string; status: ActiveSession["status"]; endRequestedAt?: string };
  }>(`/sessions/${encodeURIComponent(sessionId)}/end`, { method: "POST" });
  return response.data;
};
