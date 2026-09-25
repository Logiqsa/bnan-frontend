import { apiRequest } from "@/api/client";

export interface StudentSessionReportSummary {
  status?: string;
  participantRows?: number;
  uniqueParticipants?: number;
  durationMinutes?: number;
  processedAt?: string;
  errorCode?: string;
  message?: string;
}

export interface StudentSessionReport {
  sessionId: string;
  sessionName?: string;
  status?: string;
  summary?: StudentSessionReportSummary | null;
  participants?: Array<{
    name?: string;
    email?: string;
    joinTime?: string;
    leaveTime?: string;
    durationSeconds?: number;
  }>;
}

export interface StudentSessionReportResponse {
  success: true;
  pagination?: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
  data: StudentSessionReport;
}

export const studentSessionReportApi = {
  getReport: (sessionId: string) =>
    apiRequest<StudentSessionReportResponse>(
      `/sessions/${encodeURIComponent(sessionId)}/report?page=1&limit=1`,
    ),
};
