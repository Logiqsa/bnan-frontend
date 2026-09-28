import { apiRequest } from "./client";

export interface CreateTeacherClassroomLeaveRequestInput {
  classroomId: string;
  classroomSubjectId: string;
  notes: string;
}

interface TeacherClassroomLeaveRequest {
  id?: string;
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
};
