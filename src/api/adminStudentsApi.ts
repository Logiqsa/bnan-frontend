import { apiRequest } from "@/api/client";

export interface AdminStudentUser { id?: string; fullName?: string | null; email?: string | null; role?: string | null; status?: string | null; isVerified?: boolean | null; createdAt?: string | null; updatedAt?: string | null; }
export interface AdminStudentEntity { id?: string; name?: string | null; }
export interface AdminStudent { id?: string; user?: AdminStudentUser | null; parent?: { id?: string; phone?: string | null; whatsappNumber?: string | null; user?: AdminStudentUser | null } | null; curriculum?: AdminStudentEntity | null; grade?: AdminStudentEntity | null; subjects?: AdminStudentEntity[]; registrationType?: string | null; studentType?: "academy" | "course_academic" | "course_general" | string | null; registrationStatus?: string | null; createdAt?: string | null; updatedAt?: string | null; }
export interface AdminStudentRegistrationClassroom extends AdminStudentEntity { sourceType?: string | null; courseMode?: string | null; isActive?: boolean | null; course?: AdminStudentEntity | null; courseGroup?: AdminStudentEntity | null; }
export interface AdminStudentCourseRegistration { id?: string; course?: AdminStudentEntity | null; group?: AdminStudentEntity | null; classroom?: AdminStudentRegistrationClassroom | null; mode?: string | null; status?: string | null; enrolledAt?: string | null; createdAt?: string | null; }
export interface AdminStudentClassroomRegistration { id?: string; classroom?: AdminStudentRegistrationClassroom | null; status?: string | null; joinedAt?: string | null; createdAt?: string | null; }
export interface AdminStudentRegistrations { courses: AdminStudentCourseRegistration[]; classrooms: AdminStudentClassroomRegistration[]; }
export interface AdminStudentFilters { search?: string; status?: string; parent?: string; registrationType?: string; studentType?: string; registrationStatus?: string; curriculum?: string; grade?: string; from?: string; to?: string; page?: number; limit?: number; }
export interface AdminStudentPagination { current_page: number; last_page: number; per_page: number; total: number; }
interface AdminStudentListResponse { success: true; results: number; data: AdminStudent[]; pagination: AdminStudentPagination; }
interface AdminStudentDetailResponse { success: true; data: AdminStudent; }
interface AdminStudentRegistrationsResponse { success: true; data: AdminStudentRegistrations; }

const queryString = (filters: AdminStudentFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
  return query.toString();
};

export const listAdminStudents = async (filters: AdminStudentFilters = {}) => {
  const query = queryString(filters);
  return apiRequest<AdminStudentListResponse>(`/admin/students${query ? `?${query}` : ""}`);
};

export const getAdminStudent = async (id: string) => (await apiRequest<AdminStudentDetailResponse>(`/admin/students/${encodeURIComponent(id)}`)).data;
export const getAdminStudentRegistrations = async (id: string) => (await apiRequest<AdminStudentRegistrationsResponse>(`/admin/students/${encodeURIComponent(id)}/registrations`)).data;
