import { apiRequest } from "./client";

export type AttendanceStatus = "present" | "absent" | "late";

export interface TeacherAttendanceRecord {
  _id?: string;
  id?: string;
  session: string | { _id?: string; id?: string };
  student: string | {
    _id?: string;
    id?: string;
    fullName?: string;
    user?: { fullName?: string };
  };
  status: AttendanceStatus;
  joinedAt?: string | null;
  leftAt?: string | null;
  duration?: number | null;
}

export interface TeacherClassroomStudent {
  id: string;
  studentId: string;
  userId?: string;
  fullName: string;
  email?: string;
}

export const teacherAttendanceApi = {
  listClassroomStudents: async (classroomId: string) => {
    const response = await apiRequest<{ success: true; data: TeacherClassroomStudent[] }>(
      `/teachers/${encodeURIComponent(classroomId)}/students`,
    );
    return Array.isArray(response.data) ? response.data : [];
  },
  list: async () => {
    const response = await apiRequest<{
      success: true;
      length: number;
      data: TeacherAttendanceRecord[];
    }>("/attendance");
    return response.data;
  },
  update: async (attendanceId: string, status: AttendanceStatus) => {
    const response = await apiRequest<{
      success: true;
      data: TeacherAttendanceRecord;
    }>(`/attendance/${encodeURIComponent(attendanceId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response.data;
  },
  create: async (sessionId: string, studentId: string, status: AttendanceStatus) => {
    const response = await apiRequest<{ success: true; data: TeacherAttendanceRecord }>(
      "/attendance",
      {
        method: "POST",
        body: JSON.stringify({ session: sessionId, student: studentId, status }),
      },
    );
    return response.data;
  },
};
