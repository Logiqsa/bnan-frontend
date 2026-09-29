import { apiRequest } from "@/api/client";

export interface TeacherSessionStatistics {
  teacherId: string;
  userId?: string | null;
  fullName?: string | null;
  email?: string | null;
  sessionsCount: number;
  totalMinutes: number;
  totalHours: number;
  period?: { from: string; to: string } | null;
}

export const teacherSessionStatisticsApi = {
  getMine: async (from: string, to: string) => {
    const params = new URLSearchParams({ from, to });
    const response = await apiRequest<{ success: true; data: TeacherSessionStatistics }>(
      `/teachers/me/statistics/sessions?${params.toString()}`,
    );
    return response.data;
  },
};
