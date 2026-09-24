import { apiRequest } from "@/api/client";

export type AdminAttendanceStatus = "present" | "absent" | "late";

export interface AdminClassroomAttendanceRecord {
  id: string;
  student?: { id?: string; name?: string } | null;
  session?: { id?: string; name?: string } | null;
  status?: AdminAttendanceStatus | string;
  joinedAt?: string | null;
  leftAt?: string | null;
  duration?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminClassroomAttendanceParams {
  page?: number;
  limit?: number;
  session?: string;
  student?: string;
  from?: string;
  to?: string;
  status?: AdminAttendanceStatus;
}

export interface AdminClassroomAttendanceResponse {
  success: true;
  results: number;
  data: AdminClassroomAttendanceRecord[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const queryString = (params: AdminClassroomAttendanceParams) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
};
export const adminClassroomAttendanceApi = {
  listClassroomAttendance: (classroomId: string, params: AdminClassroomAttendanceParams = {}) => {
    const query = queryString(params);
    return apiRequest<AdminClassroomAttendanceResponse>(
      `/admin/classrooms/${encodeURIComponent(classroomId)}/attendance${query ? `?${query}` : ""}`,
    );
  },
};
