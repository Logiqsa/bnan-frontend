import { apiRequest } from "./client";
import type { ActiveSession, PortalLesson, RegistrationMode } from "./types";

interface EgyptianLesson { id: string; date: string; startTime: string; scheduledAt: string; classroom: {id:string;name:string}; classroomSubjectId:string; subject:{id:string;name:string}; teacher?:{name?:string;fullName?:string}; activeSession?: PortalLesson["activeSession"] }
interface ScheduleWeekMetadata {
  currentWeek?: number | null;
  currentWeekStart?: string | null;
  weekStart: string;
  weekEnd?: string;
  timezone?: string;
}
interface EgyptianResponse { data: ScheduleWeekMetadata & { days?: Array<{dayName:string;lessons?:EgyptianLesson[]}> } }

interface GulfEntity { id: string; name: string }
export interface GulfScheduleActiveSession {
  sessionId: string;
  status: ActiveSession["status"];
  canJoin?: boolean;
  classroomId?: string;
  subjectId?: string;
  classroomSubjectId?: string;
  occurrenceKey?: string;
  chatRoomId?: string;
  recordingUrl?: string | null;
  summaryUrl?: string | null;
}
export interface GulfScheduleEntry {
  _id: string;
  day: string;
  startTime: string;
  endTime?: string;
  activeSession?: GulfScheduleActiveSession | null;
}
export interface GulfRoom {
  id: string;
  name: string;
  grade?: GulfEntity | null;
  curriculum?: GulfEntity | null;
  subject: GulfEntity | null;
  classroomSubject: string | null;
  hasSubjectConflict?: boolean;
  schedule?: {
    id: string;
    classroomSubject: string | null;
    entries?: GulfScheduleEntry[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}
interface GulfStudentSchedule {
  student: { id: string; fullName: string };
  classrooms?: GulfRoom[];
}
interface GulfResponse {
  data: {
    currentWeek?: number | null;
    currentWeekStart?: string | null;
    weekStart: string;
    weekEnd?: string;
    timezone?: string;
    students?: GulfStudentSchedule[];
    classrooms?: GulfRoom[];
  };
}
export interface NormalizedGulfSchedule {
  currentWeek?: number | null;
  currentWeekStart?: string | null;
  weekStart: string;
  weekEnd?: string;
  timezone?: string;
  classrooms: GulfRoom[];
}
interface StartResponse { success:true; data:{session:unknown;meetingLink:string;teacherStartUrl?:string} }
interface JoinResponse { success:true; data:{meetingLink?:string;status?:string} }

const DAY_INDEX: Record<string, number> = { saturday: 0, sunday: 1, monday: 2, tuesday: 3, wednesday: 4, thursday: 5, friday: 6 };
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const normalizeGulfSchedule = (
  data: GulfResponse["data"],
): NormalizedGulfSchedule => {
  const studentClassrooms =
    data.students?.length === 1 ? data.students[0].classrooms || [] : null;

  return {
    currentWeek: data.currentWeek,
    currentWeekStart: data.currentWeekStart,
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    timezone: data.timezone,
    classrooms: studentClassrooms ?? data.classrooms ?? [],
  };
};

export interface PortalScheduleWeek extends ScheduleWeekMetadata {
  lessons: PortalLesson[];
}

export async function getScheduleWeek(mode: RegistrationMode, weekStart: string): Promise<PortalScheduleWeek> {
  const path = mode === "egyptian" ? "egyptianSchedules" : "gulfSchedules";
  if (mode === "egyptian") {
    const result = await apiRequest<EgyptianResponse>(`/${path}/mySchedule?weekStart=${encodeURIComponent(weekStart)}`);
    const lessons = (result.data.days || []).flatMap((day) =>
    (day.lessons || []).map((lesson) => ({
      key: `egyptian-${lesson.id}-${lesson.date}`, lessonId: lesson.id, registrationMode: mode,
      classroom: lesson.classroom, classroomSubjectId: lesson.classroomSubjectId,
      subject: lesson.subject, teacher: lesson.teacher, day: day.dayName,
      date: lesson.date, startTime: lesson.startTime, scheduledAt: lesson.scheduledAt,
      activeSession: lesson.activeSession || null,
    })),);
    return {
      currentWeek: result.data.currentWeek,
      currentWeekStart: result.data.currentWeekStart,
      weekStart: result.data.weekStart || weekStart,
      weekEnd: result.data.weekEnd,
      timezone: result.data.timezone,
      lessons,
    };
  }
  const result = await apiRequest<GulfResponse>(`/${path}/mySchedule?weekStart=${encodeURIComponent(weekStart)}`);
  const schedule = normalizeGulfSchedule(result.data);
  const lessons = schedule.classrooms.flatMap((room) => room.subject ? (room.schedule?.entries || []).map((entry, i) => ({
    key: `gulf-${room.classroomSubject}-${entry.day}-${entry.startTime}-${i}`, registrationMode: mode,
    classroom: { id: room.id, name: room.name }, classroomSubjectId: room.classroomSubject || "",
    subject: room.subject, day: entry.day, date: addDays(schedule.weekStart, DAY_INDEX[entry.day] ?? 0),
    startTime: entry.startTime, endTime: entry.endTime, scheduledAt: null,
    activeSession: entry.activeSession ? {
      id: entry.activeSession.sessionId,
      sessionId: entry.activeSession.sessionId,
      status: entry.activeSession.status,
      canJoin: entry.activeSession.canJoin,
      classroomId: entry.activeSession.classroomId,
      subjectId: entry.activeSession.subjectId,
      classroomSubjectId: entry.activeSession.classroomSubjectId,
      occurrenceKey: entry.activeSession.occurrenceKey,
      chatRoomId: entry.activeSession.chatRoomId,
      recordingUrl: entry.activeSession.recordingUrl,
      summaryUrl: entry.activeSession.summaryUrl,
    } : null,
  })) : []);
  return { ...schedule, lessons };
}

export const getSchedule = async (mode: RegistrationMode, weekStart: string) =>
  (await getScheduleWeek(mode, weekStart)).lessons;

export const startLesson = (lesson: PortalLesson) => apiRequest<StartResponse>(`/classrooms/${lesson.classroom.id}/sessions/start`, {
  method: "POST", body: JSON.stringify({
    subjectId: lesson.subject.id,
    ...(lesson.lessonId ? { lessonId: lesson.lessonId } : {}),
    occurrenceDate: lesson.date,
    classroomSubjectId: lesson.classroomSubjectId,
    scheduledStartTime: lesson.startTime,
  }),
});

export const joinLesson = (classroomId: string) => apiRequest<JoinResponse>(`/classrooms/${classroomId}/sessions/active/join`);

export interface ActiveClassroomSession {
  sessionId: string;
  status: ActiveSession["status"];
  teacher?: { id?: string; userId?: string; fullName?: string } | null;
  classroomId?: string;
  subjectId?: string;
  classroomSubjectId?: string;
  occurrenceKey?: string;
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
