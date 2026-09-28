import { apiRequest } from "./client";

export interface CreateTeacherClassroomLeaveRequestInput {
  classroomId: string;
  classroomSubjectId: string;
  notes: string;
}

export interface TeacherClassroomLeaveRequest {
  id?: string;
  _id?: string;
  classroomSubject?: string | { id?: string; _id?: string } | null;
  requestType?: "teacher_leave" | string;
  status: "pending" | "approved" | "rejected" | "cancelled";
}

export const teacherClassroomChangeRequestsApi = {
  createLeaveRequest: async ({
    classroomId,
    classroomSubjectId,
    notes,
  }: CreateTeacherClassroomLeaveRequestInput) =>
    (
      await apiRequest<{ success: true; data: TeacherClassroomLeaveRequest }>(
        `/classrooms/${encodeURIComponent(classroomId)}/teacher-requests`,
        {
          method: "POST",
          body: JSON.stringify({ classroomSubjectId, notes }),
        },
      )
    ).data,
  listLeaveRequests: async (classroomId: string) =>
    (
      await apiRequest<{
        success: true;
        data: TeacherClassroomLeaveRequest[];
      }>(`/classrooms/${encodeURIComponent(classroomId)}/change-requests`)
    ).data,
};
