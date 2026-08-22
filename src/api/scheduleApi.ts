import { apiRequest } from "./client";
import type { PortalLesson, RegistrationMode } from "./types";

interface EgyptianLesson { id: string; date: string; startTime: string; scheduledAt: string; classroom: {id:string;name:string}; classroomSubjectId:string; subject:{id:string;name:string}; teacher?:{name?:string;fullName?:string}; activeSession?: PortalLesson["activeSession"] }
interface EgyptianResponse { data: { days?: Array<{dayName:string;lessons?:EgyptianLesson[]}> } }
interface GulfRoom { id:string; name:string; classroomSubject:string; subject:{id:string;name:string}; schedule?:{entries?:Array<{day:string;startTime:string}>} }
interface GulfResponse { data: { weekStart:string; classrooms?:GulfRoom[] } }
interface StartResponse { success:true; data:{session:unknown;meetingLink:string;teacherStartUrl?:string} }
interface JoinResponse { success:true; data:{meetingLink?:string;status?:string} }

const DAY_INDEX: Record<string, number> = { saturday: 0, sunday: 1, monday: 2, tuesday: 3, wednesday: 4, thursday: 5, friday: 6 };
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export async function getSchedule(mode: RegistrationMode, weekStart: string): Promise<PortalLesson[]> {
  const path = mode === "egyptian" ? "egyptianSchedules" : "gulfSchedules";
  if (mode === "egyptian") {
    const result = await apiRequest<EgyptianResponse>(`/${path}/mySchedule?weekStart=${encodeURIComponent(weekStart)}`);
    return (result.data.days || []).flatMap((day) =>
    (day.lessons || []).map((lesson) => ({
      key: `egyptian-${lesson.id}-${lesson.date}`, lessonId: lesson.id, registrationMode: mode,
      classroom: lesson.classroom, classroomSubjectId: lesson.classroomSubjectId,
      subject: lesson.subject, teacher: lesson.teacher, day: day.dayName,
      date: lesson.date, startTime: lesson.startTime, scheduledAt: lesson.scheduledAt,
      activeSession: lesson.activeSession || null,
    })),);
  }
  const result = await apiRequest<GulfResponse>(`/${path}/mySchedule?weekStart=${encodeURIComponent(weekStart)}`);
  return (result.data.classrooms || []).flatMap((room) => (room.schedule?.entries || []).map((entry, i) => ({
    key: `gulf-${room.classroomSubject}-${entry.day}-${entry.startTime}-${i}`, registrationMode: mode,
    classroom: { id: room.id, name: room.name }, classroomSubjectId: room.classroomSubject,
    subject: room.subject, day: entry.day, date: addDays(result.data.weekStart, DAY_INDEX[entry.day] ?? 0),
    startTime: entry.startTime, scheduledAt: null, activeSession: null,
  })));
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

export const joinLesson = (classroomId: string) => apiRequest<JoinResponse>(`/classrooms/${classroomId}/sessions/active/join`);
