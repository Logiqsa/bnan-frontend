import { apiRequest } from "./client";

export interface TeacherClassroomAssignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  attachment?: string | null;
  totalPoints?: number;
  status?: "active" | "finished" | string;
  subject?: { id?: string; name?: string } | string | null;
  classroomSubject?: {
    id?: string;
    subject?: { id?: string; name?: string } | null;
  } | null;
  classroom?: { id?: string; name?: string } | null;
}

export interface TeacherClassroomAssignmentsResponse {
  success: true;
  results: number;
  data: TeacherClassroomAssignment[];
}

export const teacherClassroomAssignmentsApi = {
  list: (classroomId: string) =>
    apiRequest<TeacherClassroomAssignmentsResponse>(
      `/classrooms/${encodeURIComponent(classroomId)}/assignments`,
    ),
};
