import { apiRequest } from "./client";
import type { RegistrationMode } from "./types";

export interface CurriculumOption { id:string; name:string; registrationMode:RegistrationMode; icon?:string }
export interface GradeOption { id:string; name:string; isActive:boolean }
export interface SubjectOption { id:string; name:string }
interface ListResponse<T> { success:true; data:T[]; hasNextPage:boolean }

export const catalogApi = {
  curriculums: () => apiRequest<ListResponse<CurriculumOption>>("/api/v1/curriculums?page=1&limit=100&sort=name&fields=name,registrationMode,icon"),
  grades: (curriculumId:string) => apiRequest<ListResponse<GradeOption>>(`/api/v1/grades/curriculum/${curriculumId}?page=1&limit=100&sort=name&isActive=true&fields=name,isActive`),
  subjects: (gradeId:string) => apiRequest<{success:true;data:SubjectOption[]}>(`/api/v1/grades/${gradeId}/subjects`),
};
