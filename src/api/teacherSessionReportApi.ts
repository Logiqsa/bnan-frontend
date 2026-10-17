import { apiRequest } from "@/api/client";

export interface ZoomSessionParticipant {
  key?: string;
  name?: string;
  email?: string;
  userId?: string;
  joinTime?: string;
  leaveTime?: string;
  durationSeconds?: number;
  totalDurationSeconds?: number;
  visitCount?: number;
  visits?: Array<{
    joinedAt?: string | null;
    leftAt?: string | null;
    durationSeconds?: number;
  }>;
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
    meetingDurationSeconds?: number | null;
    participantTotalDurationSeconds?: number;
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
