import { apiRequest } from "./client";
import type { RegistrationMode } from "./types";

export interface CurriculumOption { id:string; name:string; description?:string; registrationMode:RegistrationMode; icon?:string }
export interface GradeOption { id:string; name:string; isActive:boolean }
export interface SubjectOption { id:string; name:string }
export interface PackageOption { id:string; name:string; curriculum:string; accessScope:"all_subjects"|"single_subject"; hours?:number; months?:number; oldPrice?:number; price:number; currency:string; isPopular?:boolean; isActive?:boolean }
interface ListResponse<T> { success:true; data:T[]; hasNextPage:boolean }

export const catalogApi = {
  curriculums: () => apiRequest<ListResponse<CurriculumOption>>("/curriculums?page=1&limit=100&sort=name&fields=name,description,registrationMode,icon"),
  grades: (curriculumId:string) => apiRequest<ListResponse<GradeOption>>(`/grades/curriculum/${curriculumId}?page=1&limit=100&isActive=true&fields=name,isActive`),
  subjects: (gradeId:string) => apiRequest<{success:true;data:SubjectOption[]}>(`/grades/${gradeId}/subjects`),
  packages: (curriculumId:string) => apiRequest<{success:true;data:PackageOption[]}>(`/packages/curriculum/${curriculumId}`),
};
