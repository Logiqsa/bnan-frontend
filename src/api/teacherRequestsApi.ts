import { apiRequest } from "@/api/client";

export const teacherPendingRequestsQueryKey = ["teacher-pending-requests"] as const;
export const teacherPendingRequestsPageQueryKey = (page: number, limit: number) =>
  [...teacherPendingRequestsQueryKey, { page, limit }] as const;

export interface PendingTeacherRequest {
  requestId: string;
  subjectRequestId?: string;
  studentId?: string;
  studentName?: string;
  curriculumId?: string;
  curriculumName?: string;
  gradeId?: string;
  gradeName?: string;
  subjectId?: string;
  subjectName?: string;
  notes?: string | null;
  requestStatus?: string;
  requestedAt?: string;
}

export interface AcceptedTeacherRequest {
  requestId: string;
  subjectRequestId?: string;
  status: "accepted" | string;
  classroom?: { id?: string; name?: string };
  chatRoom?: { id?: string };
}

export interface TeacherRequestsPagination {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface PendingTeacherRequestsResponse {
  success: true;
  results?: number;
  data: PendingTeacherRequest[];
  pagination?: TeacherRequestsPagination;
}

export const teacherRequestsApi = {
  listPending: async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    const response = await apiRequest<PendingTeacherRequestsResponse>(
      `/gulf-teacher-requests?${query.toString()}`,
    );
    return {
      ...response,
      data: Array.isArray(response.data) ? response.data : [],
    };
  },
  accept: async (requestId: string) => {
    const response = await apiRequest<{
      success: true;
      data: AcceptedTeacherRequest;
    }>(`/gulf-teacher-requests/${encodeURIComponent(requestId)}/accept`, {
      method: "PATCH",
    });
    return response.data;
  },
};
