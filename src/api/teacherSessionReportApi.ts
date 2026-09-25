import { apiRequest } from "@/api/client";

export interface ZoomSessionParticipant {
  name?: string;
  email?: string;
  joinTime?: string;
  leaveTime?: string;
  durationSeconds?: number;
}

export interface TeacherSessionReport {
  sessionId: string;
  sessionName?: string;
  status?: string;
  summary?: {
    status?: string;
    participantRows?: number;
    uniqueParticipants?: number;
    durationMinutes?: number;
    processedAt?: string;
  } | null;
  participants: ZoomSessionParticipant[];
}

export interface TeacherSessionReportResponse {
  success: true;
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
  data: TeacherSessionReport;
}

export const teacherSessionReportApi = {
  getReport: (sessionId: string, page = 1, limit = 50) =>
    apiRequest<TeacherSessionReportResponse>(
      `/sessions/${encodeURIComponent(sessionId)}/report?page=${page}&limit=${limit}`,
    ),
};
