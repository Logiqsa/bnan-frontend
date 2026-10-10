import { apiRequest } from "./client";

export interface MissingRecordingSession {
  id: string;
  title?: string;
  status?: string;
  sessionKind?: string;
  startAt?: string;
  actualEndedAt?: string;
  classroom?: { id?: string; name?: string };
  subject?: { id?: string; name?: string };
  teacher?: { id?: string; name?: string };
  recording: { status: string; errorCode?: string | null; shareUrl: boolean; localUrl: boolean };
  report: { status: string; errorCode?: string | null };
  jobs: {
    recording?: { id: string; status: string; attempts: number; lastError?: string | null } | null;
    participant?: { id: string; status: string; attempts: number; lastError?: string | null } | null;
  };
}

export interface MissingRecordingResponse {
  success: true;
  data: MissingRecordingSession[];
  pagination: { currentPage: number; perPage: number; total: number; lastPage: number };
}

export const adminZoomRecordingApi = {
  listMissing: (page = 1, limit = 25) =>
    apiRequest<MissingRecordingResponse>(`/admin/zoom-recordings/missing?page=${page}&limit=${limit}`),
  retry: (sessionId: string) =>
    apiRequest<{ success: true; data: { sessionId: string; reportReady: boolean } }>(`/admin/zoom-recordings/${encodeURIComponent(sessionId)}/retry`, { method: "POST" }),
};
