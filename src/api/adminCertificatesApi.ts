import { apiRequest } from "./client";

export type AdminCertificateType =
  | "student_monthly"
  | "ideal_teacher"
  | "ideal_supervisor"
  | "general_teacher";
export type AdminCertificateStatus = "draft" | "issued" | "revoked";

export interface AdminCertificatePeriod {
  month: number;
  year: number;
}

export interface AdminCertificateListItem {
  id: string;
  certificateNumber?: string;
  certificateType?: AdminCertificateType | string;
  recipientName?: string;
  studentName?: string;
  teacherName?: string;
  supervisorName?: string;
  gradeName?: string;
  period?: AdminCertificatePeriod;
  status?: AdminCertificateStatus | string;
  previewImagePath?: string | null;
  pdfPath?: string | null;
  createdAt?: string;
  issuedAt?: string | null;
}

export interface AdminCertificateDetail extends AdminCertificateListItem {
  _id?: string;
  recipient?: { _id?: string; fullName?: string; email?: string; role?: string } | string;
  recipientSnapshot?: { fullName?: string };
  academicContext?: {
    curriculum?: string;
    curriculumNameSnapshot?: string;
    grade?: string;
    gradeNameSnapshot?: string;
    classroom?: string;
    classroomNameSnapshot?: string;
  };
  subjects?: Array<{
    subject?: string;
    nameSnapshot?: string;
    maxScore?: number;
    score?: number;
  }>;
  totalScore?: number;
  totalMaxScore?: number;
  percentage?: number;
  signerName?: string;
  createdBy?: { _id?: string; fullName?: string; email?: string } | string;
  issuedBy?: { _id?: string; fullName?: string; email?: string } | string;
}

export interface AdminCertificateFilters {
  certificateType?: string;
  status?: string;
  gradeId?: string;
  classroomId?: string;
  studentId?: string;
  teacherId?: string;
  supervisorId?: string;
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export interface AdminCertificatePagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface ListResponse {
  success: true;
  length: number;
  data: AdminCertificateListItem[];
  pagination: AdminCertificatePagination;
}

interface DetailResponse {
  success: true;
  data: AdminCertificateDetail;
}

const queryString = (filters: AdminCertificateFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
};

export const adminCertificatesApi = {
  list: async (filters: AdminCertificateFilters = {}) => {
    const query = queryString(filters);
    return apiRequest<ListResponse>(`/certificates/admin${query ? `?${query}` : ""}`);
  },
  getById: async (id: string) =>
    (await apiRequest<DetailResponse>(`/certificates/${encodeURIComponent(id)}`)).data,
  issueDrafts: () =>
    apiRequest<{ success: true; data: { certificates: AdminCertificateDetail[] } }>(
      "/certificates/student-monthly/issue",
      { method: "POST" },
    ),
  deleteDraft: (id: string) =>
    apiRequest<void>(`/certificates/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
