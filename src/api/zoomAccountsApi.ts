import { apiRequest } from "./client";

export type ZoomAccountSetupStatus = "pending_webhook" | "ready";

export interface ZoomAccount {
  id: string;
  name: string;
  accountId: string;
  clientId: string;
  // Unset while the account is pending (Phase 1/2 of onboarding) -- only
  // resolved once verifyZoomAccount (Phase 3) succeeds.
  hostUserId?: string;
  hostEmail?: string;
  webhookKey: string;
  webhookUrl: string;
  setupStatus: ZoomAccountSetupStatus;
  apiBaseUrl?: string;
  isActive: boolean;
  verifiedAt?: string | null;
  hasClientSecret: boolean;
  hasWebhookSecret: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Phase 1 of onboarding: hostUserId is deliberately not collected here -- the
// Zoom app can't be activated in Zoom Marketplace (and hostUserId resolved)
// until it already has this account's webhook URL configured. See
// verifyZoomAccount (Phase 3) for how hostUserId gets set, from hostEmail.
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
  getZoomAccounts: () => apiRequest<ListResponse<ZoomAccount>>("/api/v1/admin/zoom-accounts"),

  getZoomAccount: (id: string) => apiRequest<ItemResponse<ZoomAccount>>(`/api/v1/admin/zoom-accounts/${id}`),

  createZoomAccount: (payload: CreateZoomAccountPayload) =>
    apiRequest<ItemResponse<ZoomAccount>>("/api/v1/admin/zoom-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateZoomAccount: (id: string, payload: UpdateZoomAccountPayload) =>
    apiRequest<ItemResponse<ZoomAccount>>(`/api/v1/admin/zoom-accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  // Phase 3: called once the admin has activated the Zoom app in Zoom
  // Marketplace using the webhookUrl shown after Phase 1. Resolves
  // hostUserId from hostEmail and activates the account.
  verifyZoomAccount: (id: string) =>
    apiRequest<ItemResponse<ZoomAccount>>(`/api/v1/admin/zoom-accounts/${id}/verify`, {
      method: "POST",
    }),

  assignZoomAccountToGrade: (gradeId: string, zoomAccountId: string) =>
    apiRequest<ItemResponse<unknown>>(`/api/v1/grades/${gradeId}/zoom-account`, {
      method: "PATCH",
      body: JSON.stringify({ zoomAccountId }),
    }),

  getGradesForZoomAssignment: (curriculumId: string) =>
    apiRequest<ListResponse<GradeZoomOption>>(
      `/api/v1/grades/curriculum/${curriculumId}?page=1&limit=100&sort=name&fields=name,isActive,zoomAccount`,
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
