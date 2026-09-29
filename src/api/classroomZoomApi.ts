import { apiRequest } from "./client";
import type { ClassroomOption } from "./classroomRecordingsApi";
import {
  getUnifiedClassroomSchedule,
  reconcileUnifiedClassroomSchedule,
  type ClassroomScheduleEntry,
  type UnifiedClassroomSchedule,
} from "./scheduleApi";

export type { ClassroomScheduleEntry } from "./scheduleApi";

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

export interface ClassroomZoomDetails {
  id: string;
  name: string;
  isActive?: boolean;
  curriculum?: string | { id?: string; _id?: string; name?: string; registrationMode?: "egyptian" | "gulf" };
  grade?: string | { id?: string; _id?: string; name?: string };
  teacher?: string | { id?: string; _id?: string; name?: string; fullName?: string } | null;
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

  getSchedule: async (classroomId: string, weekStart?: string): Promise<ItemResponse<UnifiedClassroomSchedule>> => ({
    success: true,
    data: await getUnifiedClassroomSchedule(classroomId, weekStart),
  }),

  saveScheduleEntries: (
    classroomId: string,
    originalEntries: ClassroomScheduleEntry[],
    nextEntries: ClassroomScheduleEntry[],
  ) => reconcileUnifiedClassroomSchedule(classroomId, originalEntries, nextEntries),
};
