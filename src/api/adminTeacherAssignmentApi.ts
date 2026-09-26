import { apiRequest } from "./client";
import { adminUsersApi, type AdminUser } from "./adminUsersApi";
import type { CurriculumOption, GradeOption } from "./catalogApi";

export interface AdminAssignmentClassroom {
  id: string;
  name: string;
  curriculum?: { id?: string; _id?: string; name?: string } | string;
  grade?: { id?: string; _id?: string; name?: string } | string;
  isActive?: boolean;
}

export interface AdminAssignmentSubject {
  id: string;
  classroomSubjectId: string;
  subjectId: string;
  name: string;
  teacher?: { id?: string; name?: string } | null;
  isActive: boolean;
}

interface ListResponse<T> {
  success: true;
  data: T[];
}

interface AssignmentResponse {
  success: true;
  data: {
    classroomSubject?: { id?: string; teacher?: string };
    previousTeacher?: string | null;
    replaced?: boolean;
  };
}

export const adminTeacherAssignmentApi = {
  listCurriculums: () =>
    apiRequest<ListResponse<CurriculumOption>>("/curriculums?page=1&limit=100&sort=name&fields=name,registrationMode"),
  listGrades: (curriculumId: string) =>
    apiRequest<ListResponse<GradeOption>>(`/grades/curriculum/${encodeURIComponent(curriculumId)}?page=1&limit=100&isActive=true&fields=name,isActive`),
  listClassrooms: (curriculumId: string, gradeId: string) =>
    apiRequest<ListResponse<AdminAssignmentClassroom>>(`/classrooms?status=active&page=1&limit=100&curriculum=${encodeURIComponent(curriculumId)}&grade=${encodeURIComponent(gradeId)}`),
  listSubjects: (classroomId: string) =>
    apiRequest<{ success: true; data: { subjects: AdminAssignmentSubject[] } }>(`/classrooms/${encodeURIComponent(classroomId)}/subjects`),
  listTeachers: () =>
    adminUsersApi.listAllWithTeacherProfiles(),
  assign: (classroomId: string, subjectId: string, teacherId: string) =>
    apiRequest<AssignmentResponse>(`/classrooms/${encodeURIComponent(classroomId)}/teacher`, {
      method: "PATCH",
      body: JSON.stringify({ subjectId, teacherId }),
    }),
};

export type AdminAssignmentTeacher = AdminUser;
