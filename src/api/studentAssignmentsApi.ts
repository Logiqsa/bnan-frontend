import { apiRequest } from "@/api/client";

export type StudentAssignmentSubmissionStatus = "submitted" | "reviewed" | null;

export interface StudentAssignment {
  id: string;
  teacher: string;
  subject: { id: string; name: string } | null;
  title: string;
  description?: string;
  dueDate: string;
  attachment?: string;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
  submitted: boolean;
  status: StudentAssignmentSubmissionStatus;
  grade: number | null;
  feedback: null;
  submittedAt: string | null;
}

interface StudentAssignmentsResponse {
  success: true;
  results: number;
  data: StudentAssignment[];
}

export interface StudentAssignmentSubmission {
  id: string;
  assignment: string;
  student: string;
  attachment?: string;
  status: "submitted" | "reviewed";
  score?: number;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface SubmitAssignmentResponse {
  success: true;
  data: StudentAssignmentSubmission;
}

export const studentAssignmentsQueryKey = ["student-assignments"] as const;

export const studentAssignmentsApi = {
  list: async (): Promise<StudentAssignment[]> => {
    const response = await apiRequest<StudentAssignmentsResponse>("/students/me/assignments");
    return response.data;
  },

  submitAssignment: async (assignmentId: string, file: File): Promise<StudentAssignmentSubmission> => {
    const body = new FormData();
    body.append("attachment", file);
    const response = await apiRequest<SubmitAssignmentResponse>(
      `/assignments/${encodeURIComponent(assignmentId)}/submit`,
      { method: "POST", body },
    );
    return response.data;
  },
};
