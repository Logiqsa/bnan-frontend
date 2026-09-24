import { apiRequest } from "@/api/client";

export interface AdminDashboardStatistics {
  totalStudents?: number;
  pendingStudentRegistrations?: number;
  activeSubscriptions?: number;
  expiredSubscriptions?: number;
  pendingReceipts?: number;
  totalTeachers?: number;
  todaySessions?: number;
  todayTimezone?: string;
}

export const adminDashboardApi = {
  statistics: async () => {
    const result = await apiRequest<{ success: true; data: { statistics: AdminDashboardStatistics } }>("/admin/dashboard/statistics");
    return result.data.statistics;
  },
};
