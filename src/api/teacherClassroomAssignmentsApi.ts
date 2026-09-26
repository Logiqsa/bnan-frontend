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
    subject?: { id?: string; _id?: string; name?: string } | null;
    classroom?: { id?: string; _id?: string; name?: string } | null;
  } | null;
  classroom?: { id?: string; _id?: string; name?: string } | null;
}

export interface TeacherClassroomAssignmentsResponse {
  success: true;
  results: number;
  data: TeacherClassroomAssignment[];
}

export interface TeacherAssignmentSubmission {
  studentId: string;
  fullName: string;
  hasSubmitted: boolean;
  submissionStatus: "not_submitted" | "submitted" | "reviewed" | string;
  submission: {
    id: string;
    attachment?: string | null;
    status: string;
    score?: number | null;
    submittedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export interface TeacherAssignmentSubmissionsResponse {
  success: true;
  results: number;
  assignment: { id: string; title: string };
  summary: { totalStudents: number; reviewed: number; submitted: number; notSubmitted: number };
  data: TeacherAssignmentSubmission[];
}

export interface TeacherAssignmentCreateInput {
  classroomId: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  totalPoints: number;
  attachment?: File | null;
}

export const teacherClassroomAssignmentsApi = {
  list: (classroomId: string) =>
    apiRequest<TeacherClassroomAssignmentsResponse>(
      `/classrooms/${encodeURIComponent(classroomId)}/assignments`,
    ),
  create: ({ classroomId, subjectId, title, description, dueDate, totalPoints, attachment }: TeacherAssignmentCreateInput) => {
    const body = new FormData();
    body.append("classroom", classroomId);
    body.append("subject", subjectId);
    body.append("title", title);
    body.append("description", description || "");
    body.append("dueDate", dueDate);
    body.append("totalPoints", String(totalPoints));
    if (attachment) body.append("attachment", attachment);
    return apiRequest<{ success: true; data: TeacherClassroomAssignment }>("/assignments", { method: "POST", body });
  },
  get: (assignmentId: string) =>
    apiRequest<{ success: true; data: TeacherClassroomAssignment }>(`/assignments/${encodeURIComponent(assignmentId)}`),
  listSubmissions: (assignmentId: string) =>
    apiRequest<TeacherAssignmentSubmissionsResponse>(`/assignments/${encodeURIComponent(assignmentId)}/submissions`),
  reviewSubmission: (assignmentId: string, submissionId: string, score: number) =>
    apiRequest<{ success: true; data: unknown }>(`/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(submissionId)}/review`, {
      method: "PATCH",
      body: JSON.stringify({ score }),
    }),
};
