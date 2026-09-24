import { apiRequest } from "@/api/client";

export type AdminAssignmentStatus = "active" | "finished";

export interface AdminAssignmentTeacher {
  id?: string;
  user?: { id?: string; fullName?: string; email?: string } | null;
}

export interface AdminAssignmentReference {
  id?: string;
  name?: string;
}

export interface AdminAssignment {
  id: string;
  teacher?: AdminAssignmentTeacher | null;
  subject?: AdminAssignmentReference | null;
  classroomSubject?: { id?: string } | null;
  classroom?: AdminAssignmentReference | null;
  curriculum?: AdminAssignmentReference | null;
  grade?: AdminAssignmentReference | null;
  sourceType?: string | null;
  course?: string | AdminAssignmentReference | null;
  courseGroup?: string | AdminAssignmentReference | null;
  title?: string | null;
  description?: string | null;
  dueDate?: string | null;
  attachment?: string | null;
  totalPoints?: number | null;
  createdAt?: string;
  updatedAt?: string;
  status?: AdminAssignmentStatus | string | null;
}

export interface AdminAssignmentSubmission {
  id: string;
  assignment?: string | { id?: string } | null;
  student?: { id?: string; user?: { id?: string; fullName?: string; email?: string } | null } | null;
  attachment?: string | null;
  status?: string | null;
  score?: number | null;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminAssignmentPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AdminAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  title?: string;
  teacher?: string;
  subject?: string;
  classroom?: string;
  curriculum?: string;
  grade?: string;
  from?: string;
  to?: string;
  status?: AdminAssignmentStatus;
}

export interface AdminSubmissionListParams {
  page?: number;
  limit?: number;
}

interface AssignmentListResponse {
  success: true;
  results: number;
  data: AdminAssignment[];
  pagination: AdminAssignmentPagination;
}

interface AssignmentDetailResponse {
  success: true;
  data: AdminAssignment;
}

interface SubmissionListResponse {
  success: true;
  results: number;
  assignment: { id: string; title?: string | null };
  data: AdminAssignmentSubmission[];
  pagination: AdminAssignmentPagination;
}

interface SubmissionDetailResponse {
  success: true;
  data: AdminAssignmentSubmission;
}

const queryString = (params: object) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
};

export const adminAssignmentsApi = {
  listAssignments: (params: AdminAssignmentListParams = {}) => {
    const query = queryString(params);
    return apiRequest<AssignmentListResponse>(`/admin/assignments${query ? `?${query}` : ""}`);
  },
  getAssignment: (id: string) =>
    apiRequest<AssignmentDetailResponse>(`/admin/assignments/${encodeURIComponent(id)}`),
  listSubmissions: (assignmentId: string, params: AdminSubmissionListParams = {}) => {
    const query = queryString(params);
    return apiRequest<SubmissionListResponse>(
      `/admin/assignments/${encodeURIComponent(assignmentId)}/submissions${query ? `?${query}` : ""}`,
    );
  },
  getSubmission: (assignmentId: string, submissionId: string) =>
    apiRequest<SubmissionDetailResponse>(
      `/admin/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(submissionId)}`,
    ),
};
