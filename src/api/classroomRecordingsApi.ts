import { API_BASE_URL, ApiError, apiRequest, refreshAccessToken, tokenStore } from "./client";

export interface ClassroomOption {
  id: string;
  name: string;
  curriculum?: {
    id: string;
    _id?: string;
    name: string;
    registrationMode?: "egyptian" | "gulf";
  };
  grade?: { id: string; _id?: string; name: string };
  subject?: { id?: string; name?: string } | string | null;
  teacher?:
    | {
        id?: string;
        name?: string;
        fullName?: string;
        user?: { fullName?: string } | string;
      }
    | string
    | null;
  sourceType?: "legacy" | "course";
  classroomKind?: "general" | "shared" | "private" | "course";
  sharedAcademicTargets?: Array<{
    curriculum: string | { id?: string; _id?: string; name?: string };
    grade: string | { id?: string; _id?: string; name?: string };
  }>;
  student?: { id?: string; name?: string; fullName?: string } | string | null;
  students?: Array<{ id?: string; name?: string; fullName?: string }>;
  schedule?: {
    entries?: Array<{
      day: string;
      startTime: string;
      endTime?: string;
      subjectName?: string;
    }>;
  } | null;
  scheduleEntries?: Array<{
    day: string;
    startTime: string;
    endTime?: string;
    subjectName?: string;
  }>;
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
  zoomProvisioning?: {
    status?: "creating" | "ready" | "failed";
    errorCode?: string;
    updatedAt?: string;
  } | null;
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
  canRequestLeave?: boolean;
  isActive: boolean;
}
export interface EligibleClassroomSubject {
  id: string;
  name: string;
  isAssigned: boolean;
}

export interface ClassroomStudentOption {
  studentId: string;
  fullName: string;
  attendance?: {
    id?: string;
    status?: string;
    joinedAt?: string;
    leftAt?: string;
    duration?: number;
  } | null;
}

export interface ClassroomStudentsResponse {
  success: true;
  results: number;
  data: ClassroomStudentOption[];
}

export interface AvailableClassroomStudent {
  id: string;
  fullName: string;
  email?: string;
}

export interface StudentTransferTarget {
  id: string;
  name: string;
  classroomKind: "general" | "shared" | "private";
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
  scheduledStartAt?: string;
  endAt?: string;
  actualStartedAt?: string;
  actualEndedAt?: string;
  occurrenceKey?: string;
  courseGroup?:
    | string
    | {
        id?: string;
        _id?: string;
        name?: string;
        course?: string | { id?: string; _id?: string; name?: string } | null;
      }
    | null;
  recordingUrl?: string | null;
  recordingLink?: string | null;
  recording?: {
    status?: string;
    localUrl?: string | null;
    shareUrl?: string | null;
  } | null;
  summary?: {
    status?: string;
    title?: string | null;
    content?: string | null;
    docUrl?: string | null;
    nextSteps?: string[] | null;
  } | null;
  report?: {
    status?: string;
    participantRows?: number;
    uniqueParticipants?: number;
    durationMinutes?: number;
  } | null;
  subject?: { id?: string; name?: string } | string | null;
  teacher?: { id?: string; name?: string; fullName?: string } | string | null;
  classroomSubject?:
    | {
        id?: string;
        name?: string;
        classroom?: { id?: string; _id?: string; name?: string };
        subject?: { id?: string; _id?: string; name?: string };
      }
    | string
    | null;
  classroom?: string | { id?: string; _id?: string; name?: string } | null;
}

export interface SessionRecording {
  sessionId?: string;
  sessionName: string;
  recordingLink: string;
  localUrl?: string | null;
  shareUrl?: string | null;
  status?: string;
  scheduledStartAt?: string;
  startAt?: string;
  occurrenceKey?: string;
  courseGroup?: string | { id?: string; _id?: string } | null;
  summary?: {
    status?: string;
    content?: string | null;
    docUrl?: string | null;
  } | null;
}

export interface ClassroomRecordingsResponse {
  success: true;
  data: SessionRecording[] | { recordings?: SessionRecording[]; data?: SessionRecording[] };
}

export interface ClassroomSessionsResponse {
  success: true;
  data: ClassroomSession[] | { sessions?: ClassroomSession[]; data?: ClassroomSession[] };
}

export interface ClassroomSessionReport {
  sessionId?: string;
  sessionName?: string;
  status?: string;
  summary?: Record<string, unknown> | null;
  participants?: Array<Record<string, unknown>>;
}

export interface ClassroomSessionReportResponse {
  success: true;
  pagination?: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
  data: ClassroomSessionReport;
}

interface UploadResult {
  success: true;
  data: {
    session: {
      _id: string;
      title: string;
      status: string;
      sessionKind: string;
      startAt: string;
    };
    recordingLink: string;
  };
}

const language = () => (localStorage.getItem("bnan_language") === "en" ? "en" : "ar");

export const classroomRecordingsApi = {
  createSharedClassroom: (body: { name: string; curriculum: string; grade: string; supervisorId: string; classroomKind: "shared"; sharedAcademicTargets: Array<{ curriculum: string; grade: string }>; subjects: string[] }) => apiRequest<{ status: "success"; data: { classroom: ClassroomOption } }>("/classrooms", { method: "POST", body: JSON.stringify(body) }),
  listAllClassrooms: () => apiRequest<{ success: true; data: ClassroomOption[] }>("/classrooms?page=1&limit=100"),

  updateClassroom: (classroomId: string, body: { name?: string; classroomKind?: ClassroomOption["classroomKind"] }) => apiRequest<{ success: true; data: ClassroomOption }>(`/classrooms/${encodeURIComponent(classroomId)}`, { method: "PATCH", body: JSON.stringify(body) }),

  deleteClassroom: (classroomId: string) =>
    apiRequest<{
      success: true;
      data: {
        classroomId: string;
        status: "archived";
        alreadyArchived: boolean;
      };
    }>(`/classrooms/${encodeURIComponent(classroomId)}`, { method: "DELETE" }),

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
    apiRequest<{
      success: true;
      data: {
        subjects: ClassroomSubjectOption[];
        eligibleSubjects?: EligibleClassroomSubject[];
        sourceType?: "legacy" | "course";
        classroomKind?: ClassroomOption["classroomKind"];
      };
    }>(`/classrooms/${classroomId}/subjects`),

  addSubject: (classroomId: string, subjectId: string) => apiRequest<{ success: true; data: ClassroomSubjectOption }>(`/classrooms/${encodeURIComponent(classroomId)}/subjects`, { method: "POST", body: JSON.stringify({ subject: subjectId }) }),

  deleteSubject: (classroomId: string, classroomSubjectId: string) => apiRequest<void>(`/classrooms/${encodeURIComponent(classroomId)}/subjects/${encodeURIComponent(classroomSubjectId)}`, { method: "DELETE" }),

  listStudents: (classroomId: string) => apiRequest<ClassroomStudentsResponse>(`/classrooms/${classroomId}/students`),

  listAvailableStudents: (classroomId: string, search = "") => {
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    return apiRequest<{
      success: true;
      results: number;
      data: AvailableClassroomStudent[];
    }>(`/classrooms/${classroomId}/available-students${query.toString() ? `?${query}` : ""}`);
  },

  assignStudent: (classroomId: string, studentId: string) =>
    apiRequest<{ success: true; data: unknown }>("/enrollments/assign", {
      method: "POST",
      body: JSON.stringify({ classroom: classroomId, student: studentId }),
    }),

  listStudentTransferTargets: (classroomId: string, studentId: string, search = "") => {
    const query = new URLSearchParams();
    query.set("studentId", studentId);
    if (search.trim()) query.set("search", search.trim());
    return apiRequest<{
      success: true;
      results: number;
      data: StudentTransferTarget[];
    }>(`/classrooms/${encodeURIComponent(classroomId)}/student-transfer-targets${query.toString() ? `?${query}` : ""}`);
  },

  transferStudent: (classroomId: string, studentId: string, targetClassroomId: string) =>
    apiRequest<{ success: true; data: unknown }>(`/classrooms/${encodeURIComponent(classroomId)}/students/${encodeURIComponent(studentId)}/transfer`, {
      method: "POST",
      body: JSON.stringify({ classroom: targetClassroomId }),
    }),

  addStudentToClassroom: (classroomId: string, studentId: string, targetClassroomId: string) =>
    apiRequest<{ success: true; data: unknown }>(`/classrooms/${encodeURIComponent(classroomId)}/students/${encodeURIComponent(studentId)}/add-to-classroom`, {
      method: "POST",
      body: JSON.stringify({ classroom: targetClassroomId }),
    }),

  listRecordings: (classroomId: string) => apiRequest<ClassroomRecordingsResponse>(`/classrooms/${classroomId}/recordings`),

  listSessions: (classroomId: string) => apiRequest<ClassroomSessionsResponse>(`/classrooms/${classroomId}/sessions`),

  getSession: (sessionId: string) => apiRequest<{ success: true; data: ClassroomSession }>(`/sessions/${encodeURIComponent(sessionId)}`),

  getSessionReport: (sessionId: string) => apiRequest<ClassroomSessionReportResponse>(`/sessions/${encodeURIComponent(sessionId)}/report`),

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
          reject(new ApiError(request.status, payload.code || "API_ERROR", payload.message || "حدث خطأ غير متوقع.", payload.errors, payload.data));
        };
        request.send(body);
      };
      send();
    }),
};
