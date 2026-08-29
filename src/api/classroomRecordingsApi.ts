import { API_BASE_URL, ApiError, apiRequest, refreshAccessToken, tokenStore } from "./client";

export interface ClassroomOption {
  id: string;
  name: string;
  curriculum?: { id: string; _id?: string; name: string; registrationMode?: "egyptian" | "gulf" };
  grade?: { id: string; _id?: string; name: string };
  subject?: { id?: string; name?: string } | string | null;
  teacher?: { id?: string; name?: string; fullName?: string } | string | null;
  student?: { id?: string; name?: string; fullName?: string } | string | null;
  students?: Array<{ id?: string; name?: string; fullName?: string }>;
  schedule?: { entries?: Array<{ day: string; startTime: string; endTime?: string; subjectName?: string }> } | null;
  scheduleEntries?: Array<{ day: string; startTime: string; endTime?: string; subjectName?: string }>;
  zoomAssignmentMode?: "grade_default" | "manual";
  zoomMeeting?: {
    zoomMeetingId?: string;
    meetingLink?: string;
    provisioningStatus?: string;
    zoomAccount?: string | { id?: string; _id?: string; name?: string };
  } | null;
  zoomMeetingId?: string;
  meetingLink?: string;
  provisioningStatus?: string;
  zoomProvisioning?: { status?: "creating" | "ready" | "failed"; errorCode?: string; updatedAt?: string } | null;
  zoomAccount?: string | { id?: string; _id?: string; name?: string } | null;
  createdAt?: string;
  isActive: boolean;
}

export interface ClassroomSubjectOption {
  id: string;
  classroomSubjectId: string;
  subjectId: string;
  name: string;
  subject?: { id: string; name: string };
  teacher?: { id: string; name: string };
  isActive: boolean;
}

export interface ClassroomSession {
  id?: string;
  _id?: string;
  title?: string;
  sessionName?: string;
  status?: string;
  sessionKind?: string;
  classroomSubjectId?: string;
  startAt?: string;
  endAt?: string;
  recordingUrl?: string | null;
  recordingLink?: string | null;
  subject?: { id?: string; name?: string } | string | null;
  teacher?: { id?: string; name?: string; fullName?: string } | string | null;
  classroomSubject?: { id?: string; name?: string; subject?: { name?: string } } | string | null;
}

export interface SessionRecording {
  sessionId?: string;
  sessionName: string;
  recordingLink: string;
  localUrl?: string | null;
  shareUrl?: string | null;
}

export interface ClassroomRecordingsResponse {
  success: true;
  data: SessionRecording[] | { recordings?: SessionRecording[]; data?: SessionRecording[] };
}

export interface ClassroomSessionsResponse {
  success: true;
  data: ClassroomSession[] | { sessions?: ClassroomSession[]; data?: ClassroomSession[] };
}

interface UploadResult {
  success: true;
  data: {
    session: { _id: string; title: string; status: string; sessionKind: string; startAt: string };
    recordingLink: string;
  };
}

const language = () => localStorage.getItem("bnan_language") === "en" ? "en" : "ar";

export const classroomRecordingsApi = {
  listClassrooms: (keyword = "") => {
    const query = new URLSearchParams({
      status: "active",
      page: "1",
      limit: keyword ? "20" : "100",
    });
    if (keyword) query.set("keyword", keyword);
    return apiRequest<{ success: true; data: ClassroomOption[] }>(`/classrooms?${query}`);
  },

  listSubjects: (classroomId: string) =>
    apiRequest<{ success: true; data: { subjects: ClassroomSubjectOption[] } }>(
      `/classrooms/${classroomId}/subjects`,
    ),

  listRecordings: (classroomId: string) =>
    apiRequest<ClassroomRecordingsResponse>(`/classrooms/${classroomId}/recordings`),

  listSessions: (classroomId: string) =>
    apiRequest<ClassroomSessionsResponse>(`/classrooms/${classroomId}/sessions`),

  upload: (classroomId: string, body: FormData, onProgress: (value: number) => void) =>
    new Promise<UploadResult>((resolve, reject) => {
      const send = (retried = false) => {
        const request = new XMLHttpRequest();
        request.open("POST", `${API_BASE_URL}/classrooms/${classroomId}/recordings`);
        const token = tokenStore.get();
        if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);
        request.setRequestHeader("lang", language());
        request.responseType = "json";
        request.upload.onprogress = ({ lengthComputable, loaded, total }) => {
          if (lengthComputable && total) onProgress(Math.round((loaded * 100) / total));
        };
        request.onerror = () => reject(new ApiError(0, "NETWORK_ERROR", "تعذر الاتصال بالخدمة. تحقق من الإنترنت وحاول مجددًا."));
        request.onload = async () => {
          const payload = request.response || {};
          if (request.status === 201) {
            resolve(payload as UploadResult);
            return;
          }
          if (request.status === 401 && token && !retried) {
            const refreshResult = await refreshAccessToken();
            if (refreshResult === "refreshed") {
              send(true);
              return;
            }
            if (refreshResult === "rejected") {
              tokenStore.clear();
              window.dispatchEvent(new Event("bnan:session-expired"));
            }
          }
          reject(new ApiError(
            request.status,
            payload.code || "API_ERROR",
            payload.message || "حدث خطأ غير متوقع.",
            payload.errors,
            payload.data,
          ));
        };
        request.send(body);
      };
      send();
    }),
};
