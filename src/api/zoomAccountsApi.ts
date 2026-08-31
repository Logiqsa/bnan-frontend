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
  grade: { id: string; name: string };
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
  zoomAccount?: { id: string; name: string } | null;
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
      `/grades/curriculum/${curriculumId}?page=1&limit=100&sort=name&fields=name,isActive,zoomAccount`,
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
