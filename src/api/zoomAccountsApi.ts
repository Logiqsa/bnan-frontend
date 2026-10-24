import { apiRequest } from "./client";

export interface ZoomAccount {
  id: string;
  name: string;
  isActive: boolean;
  isConfigured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ZoomAssignmentMode = "manual" | "grade_default";
export type ZoomProvisioningStatus = "ready" | "creating" | "failed";

export interface ZoomAccountClassroomSchedule {
  day: string;
  startTime: string;
  endTime: string | null;
  subjectId: string;
  subjectName: string;
}

export interface ZoomAccountClassroom {
  id: string;
  name: string;
  isActive: boolean;
  zoomAssignmentMode: ZoomAssignmentMode;
  curriculum: { id: string; name: string; registrationMode: "egyptian" | "gulf" };
  grade: { id: string; name: string } | null;
  course: { id: string; name: string } | null;
  courseGroup: { id: string; name: string } | null;
  zoomMeetingId: string | null;
  meetingLink: string | null;
  zoomProvisioning: { status: ZoomProvisioningStatus } | null;
  createdAt: string;
  schedule: ZoomAccountClassroomSchedule[];
}

export interface ZoomAccountUsage {
  account: Pick<ZoomAccount, "id" | "name" | "isActive" | "isConfigured">;
  classrooms: ZoomAccountClassroom[];
  summary: {
    totalClassrooms: number;
    activeClassrooms: number;
    readyMeetings: number;
    manualClassrooms: number;
    gradeDefaultClassrooms: number;
  };
}

export type WeeklyZoomSlotStatus = "ready" | "cutover_pending" | "allocating" | "provisioning" | "pending" | "quarantined" | "failed" | "cancelled";

export interface WeeklyZoomClassroomAssignment {
  assignmentId: string;
  weeklySlotKey: string;
  slotId: string;
  day: string;
  startTime: string;
  endTime?: string | null;
  timezone: string;
  status: WeeklyZoomSlotStatus;
  state: string;
  cutoverState: string;
  assignmentVersion: number;
  meeting: { id: string; participantUrl: string; type: 3 | 8 } | null;
  account: { id: string; name: string; hostFingerprint: string | null } | null;
  reason: string | null;
}

export interface WeeklyZoomClassroomAssignments {
  classroom: { id: string; name: string };
  slots: WeeklyZoomClassroomAssignment[];
}

export interface WeeklyZoomAvailabilityAccount {
  account: {
    id: string;
    name: string;
    hostFingerprint: string | null;
    isActive: boolean;
    isVerified: boolean;
    poolEnabled: boolean;
    safetyStatus: string;
    safetyReason: string | null;
    legacyMaterialization: string;
    eligible: boolean;
  };
  busyBookings: Array<{
    source: "weekly_assignment" | "legacy_capacity";
    state: string;
    classroomId: string;
    classroomName: string;
    category: string;
    startTime: string;
    endTime: string;
    unknown: boolean;
  }>;
  freeWindows: Array<{ startTime: string; endTime: string; durationMinutes: number; fitsRequestedDuration: boolean | null }>;
  eligibleWindows: Array<{ startTime: string; endTime: string; durationMinutes: number; fitsRequestedDuration: boolean | null }>;
}

export interface WeeklyZoomPoolAvailability {
  advisory: true;
  day: string;
  durationMinutes: number | null;
  accounts: WeeklyZoomAvailabilityAccount[];
}

export interface WeeklyZoomRetryResult {
  attemptedCount: number;
  readyCount: number;
  unresolvedCount: number;
  results: Array<{ assignmentId: string; status: "ready" | "pending" | "failed" | "skipped"; reason: string | null }>;
}

export interface CreateZoomAccountPayload {
  name: string;
  accountId: string;
  clientId: string;
  clientSecret: string;
  hostEmail: string;
  webhookSecretToken: string;
  apiBaseUrl?: string;
}

export interface UpdateZoomAccountPayload {
  name?: string;
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  hostUserId?: string;
  hostEmail?: string;
  webhookSecretToken?: string;
  apiBaseUrl?: string;
  isActive?: boolean;
}

export interface GradeZoomOption {
  id: string;
  name: string;
  isActive: boolean;
  zoomAccount?: string | { id?: string; _id?: string; name?: string } | null;
}

interface ListResponse<T> {
  success: true;
  data: T[];
}

interface ItemResponse<T> {
  success: true;
  data: T;
}

export const zoomAccountsApi = {
  getZoomAccounts: () => apiRequest<ListResponse<ZoomAccount>>("/admin/zoom-accounts"),

  getZoomAccount: (id: string) => apiRequest<ItemResponse<ZoomAccount>>(`/admin/zoom-accounts/${id}`),

  getZoomAccountClassrooms: (id: string) =>
    apiRequest<ItemResponse<ZoomAccountUsage>>(`/admin/zoom-accounts/${id}/classrooms`),

  getClassroomWeeklyAssignments: (classroomId: string) =>
    apiRequest<ItemResponse<WeeklyZoomClassroomAssignments>>(
      `/admin/zoom-accounts/classrooms/${encodeURIComponent(classroomId)}/weekly-assignments`,
    ),

  retryClassroomWeeklyAssignments: (classroomId: string) =>
    apiRequest<ItemResponse<WeeklyZoomRetryResult>>(
      `/admin/zoom-accounts/classrooms/${encodeURIComponent(classroomId)}/weekly-assignments/retry`,
      { method: "POST" },
    ),

  getWeeklyPoolAvailability: (day: string, durationMinutes?: number) => {
    const query = new URLSearchParams({ day });
    if (durationMinutes != null) query.set("durationMinutes", String(durationMinutes));
    return apiRequest<ItemResponse<WeeklyZoomPoolAvailability>>(
      `/admin/zoom-accounts/weekly-availability?${query.toString()}`,
    );
  },

  createZoomAccount: (payload: CreateZoomAccountPayload) =>
    apiRequest<ItemResponse<ZoomAccount>>("/admin/zoom-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateZoomAccount: (id: string, payload: UpdateZoomAccountPayload) =>
    apiRequest<ItemResponse<ZoomAccount>>(`/admin/zoom-accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  verifyZoomAccount: (id: string) =>
    apiRequest<ItemResponse<ZoomAccount>>(`/admin/zoom-accounts/${id}/verify`, {
      method: "POST",
    }),

  assignZoomAccountToGrade: (gradeId: string, zoomAccountId: string) =>
    apiRequest<ItemResponse<unknown>>(`/grades/${gradeId}/zoom-account`, {
      method: "PATCH",
      body: JSON.stringify({ zoomAccountId }),
    }),

  getGradesForZoomAssignment: (curriculumId: string) =>
    apiRequest<ListResponse<GradeZoomOption>>(
      `/grades/curriculum/${curriculumId}?page=1&limit=100&fields=name,isActive,zoomAccount`,
    ),
};

export const ZOOM_REQUIRED_EVENTS = [
  "meeting.started",
  "meeting.ended",
  "recording.completed",
  "meeting.summary_completed",
  "meeting.summary_updated",
];

export const ZOOM_ERROR_MESSAGES: Record<string, string> = {
  GRADE_ZOOM_ACCOUNT_NOT_CONFIGURED: "لا يوجد حساب Zoom مربوط بهذا الصف.",
  ZOOM_ACCOUNT_INACTIVE: "حساب Zoom هذا غير جاهز أو معطّل حاليًا.",
  ZOOM_ACCOUNT_CREDENTIALS_INVALID: "بيانات اعتماد Zoom غير صحيحة. تحقق من Account ID وClient ID وClient Secret.",
  ZOOM_ACCOUNT_HOST_INVALID: "بيانات المضيف (Host) غير صحيحة أو غير موجودة في حساب Zoom هذا.",
  ZOOM_ACCOUNT_HOST_EMAIL_REQUIRED: "البريد الإلكتروني للمضيف مطلوب.",
  ZOOM_HOST_LOOKUP_SCOPE_REQUIRED: "يحتاج تطبيق Zoom صلاحية user:read:user:admin لتحديد المضيف تلقائيًا.",
  ZOOM_WEBHOOK_UNKNOWN_KEY: "مفتاح الـ Webhook غير معروف.",
  ZOOM_SECRET_DECRYPTION_FAILED: "تعذر فك تشفير بيانات حساب Zoom. حاول تحديث البيانات السرية مجددًا.",
};

export const ZOOM_REQUIRED_SCOPES = [
  "meeting:write:meeting:admin",
  "meeting:read:meeting:admin",
  "meeting:read:summary:admin",
  "report:read:meeting:admin",
  "report:read:list_meeting_participants:admin",
  "cloud_recording:read:recording:admin",
  "cloud_recording:read:list_recording_files:admin",
  "user:read:user:admin",
];
