import { apiRequest } from "./client";
import type { ClassroomOption } from "./classroomRecordingsApi";

export interface ZoomBooking {
  classroomId: string;
  classroomName?: string;
  registrationMode?: "egyptian" | "gulf";
  subjectId?: string;
  subjectName?: string;
  teacherId?: string;
  teacherName?: string;
  studentId?: string;
  studentName?: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface AvailableZoomAccount {
  id: string;
  name: string;
  available: boolean;
  bookings: ZoomBooking[];
  conflictsWithCurrentClassroom: ZoomBooking[];
}

export interface ZoomAvailability {
  timezone: string;
  accounts: AvailableZoomAccount[];
}

export interface ZoomScheduleWindow {
  startTime: string;
  endTime: string | null;
}

export interface ZoomScheduleBusyBooking extends ZoomScheduleWindow {
  classroomId?: string;
  classroomName?: string;
  gradeName?: string;
  subjectId?: string;
  subjectName?: string;
  registrationMode?: "egyptian" | "gulf";
}

export interface ZoomScheduleAvailabilityAccount {
  account: {
    id: string;
    name: string;
    isActive: boolean;
    isConfigured: boolean;
    isSelectable: boolean;
  };
  busyBookings: ZoomScheduleBusyBooking[];
  mergedBusyWindows: ZoomScheduleWindow[];
  freeWindows: ZoomScheduleWindow[];
  eligibleWindows: ZoomScheduleWindow[];
}

export interface ZoomScheduleAvailability {
  advisory: boolean;
  classroom: { id: string; name: string };
  day: string;
  durationMinutes?: number | null;
  mode: "current_account" | "account_options";
  accounts: ZoomScheduleAvailabilityAccount[];
}

export interface GeneratedZoomMeeting {
  classroomId: string;
  zoomAccount: { id: string; name: string };
  zoomMeetingId: string;
  meetingLink: string;
  provisioningStatus: string;
}

export interface ClassroomScheduleEntry {
  day: string;
  startTime: string;
  endTime?: string;
  subjectName?: string;
  classroomSubjectId?: string;
}

export interface ClassroomZoomDetails {
  id: string;
  name: string;
  curriculum?: string | { id?: string; _id?: string; name?: string; registrationMode?: "egyptian" | "gulf" };
  grade?: string | { id?: string; _id?: string; name?: string };
  zoomAssignmentMode?: "grade_default" | "manual";
  schedule?: { entries?: ClassroomScheduleEntry[] } | ClassroomScheduleEntry[] | null;
  scheduleEntries?: ClassroomScheduleEntry[];
  zoomMeeting?: Omit<Partial<GeneratedZoomMeeting>, "zoomAccount"> & { zoomAccount?: string | { id?: string; _id?: string; name?: string }; link?: string; url?: string; status?: string };
  meetingLink?: string;
  zoomMeetingId?: string;
  provisioningStatus?: string;
  zoomProvisioning?: { status?: "creating" | "ready" | "failed"; errorCode?: string; updatedAt?: string } | null;
  zoomAccount?: string | { id?: string; _id?: string; name?: string };
}

interface EgyptianScheduleResponse {
  success: true;
  data: {
    timezone?: string;
    days?: Array<{ dayName: string; lessons?: Array<{ startTime: string; endTime?: string; classroomSubjectId?: string; classroomSubject?: string | { id?: string; _id?: string }; subject?: { name?: string | { ar?: string; en?: string } } }> }>;
  };
}

interface GulfScheduleResponse {
  success: true;
  data: {
    timezone?: string;
    classroomSubject?: string | { id?: string; _id?: string };
    subject?: { name?: string | { ar?: string; en?: string } };
    schedule?: { entries?: ClassroomScheduleEntry[] } | ClassroomScheduleEntry[];
  };
}

interface ItemResponse<T> {
  success: true;
  data: T;
}

export const classroomZoomApi = {
  getMyClassrooms: () =>
    apiRequest<{ success: true; data: ClassroomOption[] }>("/supervisors/me/classrooms"),

  getClassroom: (classroomId: string) =>
    apiRequest<ItemResponse<ClassroomZoomDetails>>(`/classrooms/${classroomId}`),

  getAvailability: (classroomId: string) =>
    apiRequest<ItemResponse<ZoomAvailability>>(`/classrooms/${classroomId}/zoom-accounts/availability`),

  getScheduleAvailability: (classroomId: string, day: string, durationMinutes?: number) => {
    const query = new URLSearchParams({ day });
    if (durationMinutes) query.set("durationMinutes", String(durationMinutes));
    return apiRequest<ItemResponse<ZoomScheduleAvailability>>(
      `/classrooms/${classroomId}/zoom-schedule-availability?${query}`,
    );
  },

  generateMeeting: (classroomId: string, zoomAccountId: string) =>
    apiRequest<ItemResponse<GeneratedZoomMeeting>>(`/classrooms/${classroomId}/zoom-meeting`, {
      method: "POST",
      body: JSON.stringify({ zoomAccountId }),
    }),

  getEgyptianSchedule: (classroomId: string) =>
    apiRequest<EgyptianScheduleResponse>(`/egyptianSchedules/classroom/${classroomId}`),

  getGulfSchedule: (classroomId: string) =>
    apiRequest<GulfScheduleResponse>(`/gulfSchedules/classroom/${classroomId}`),

  saveEgyptianDay: (classroomId: string, day: string, lessons: Array<{ classroomSubject: string; startTime: string; endTime?: string }>) =>
    apiRequest(`/egyptianSchedules/classroom/${classroomId}/days/${day}`, {
      method: "PUT",
      body: JSON.stringify({ lessons }),
    }),

  deleteEgyptianDay: (classroomId: string, day: string) =>
    apiRequest(`/egyptianSchedules/classroom/${classroomId}/days/${day}`, { method: "DELETE" }),

  saveGulfSchedule: (classroomId: string, classroomSubject: string, schedule: Array<{ day: string; startTime: string; endTime?: string }>) =>
    apiRequest(`/gulfSchedules/classroom/${classroomId}`, {
      method: "PUT",
      body: JSON.stringify({ classroomSubject, schedule }),
    }),

  deleteGulfSchedule: (classroomId: string) =>
    apiRequest(`/gulfSchedules/classroom/${classroomId}`, { method: "DELETE" }),
};
