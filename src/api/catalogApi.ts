import { apiRequest } from "./client";
import type { RegistrationMode } from "./types";

export type { RegistrationMode } from "./types";

export interface CurriculumOption { id:string; name:string; description?:string; registrationMode:RegistrationMode; icon?:string }
export interface GradeOption { id:string; name:string; isActive:boolean; curriculum?:string|{id?:string;name?:string}; subjects?:SubjectOption[] }
export interface SubjectOption { id:string; name:string; curriculum?:string|{id?:string;name?:string}; grades?:GradeOption[] }
export interface PackageOption { id:string; name:string; curriculum:string|{id?:string;name?:string}; type?:"hours"|"monthly"; accessScope:"all_subjects"|"single_subject"; hours?:number; months?:number; oldPrice?:number; price:number; currency:string; discountTitle?:string; description?:string; isPopular?:boolean; isActive?:boolean }
interface ListResponse<T> { success:true; data:T[]; results?:number; hasNextPage?:boolean; currentPage?:number; totalCount?:number; totalPages?:number }

export interface CurriculumInput { name:string; description:string; registrationMode:RegistrationMode; icon?:File }
export interface GradeInput { name:string; curriculum:string }
export interface SubjectInput { name:string; curriculum:string; grades:string[] }
export interface PackageInput { name:string; curriculum:string; type:"hours"|"monthly"; accessScope:"all_subjects"|"single_subject"; hours?:number; months?:number; oldPrice:number; price:number; currency:string; discountTitle?:string; description?:string; isPopular?:boolean; isActive?:boolean }

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: "PATCH", body: JSON.stringify(body) });
const multipart = (method: "POST"|"PATCH", body: CurriculumInput): RequestInit => {
  const form = new FormData();
  form.append("name", body.name);
  form.append("description", body.description);
  form.append("registrationMode", body.registrationMode);
  if (body.icon) form.append("icon", body.icon);
  return { method, body: form };
};

export const catalogApi = {
  curriculums: () => apiRequest<ListResponse<CurriculumOption>>("/curriculums?page=1&limit=100&sort=name&fields=name,description,registrationMode,icon"),
  createCurriculum: (body: CurriculumInput) => apiRequest<{success:true;data:CurriculumOption}>("/curriculums", multipart("POST", body)),
  updateCurriculum: (id:string, body:CurriculumInput) => apiRequest<{success:true;data:CurriculumOption}>(`/curriculums/${id}`, body.icon ? multipart("PATCH", body) : patch({ name: body.name, description: body.description, registrationMode: body.registrationMode })),
  deleteCurriculum: (id:string) => apiRequest<void>(`/curriculums/${id}`, { method: "DELETE" }),
  grades: (curriculumId:string) => apiRequest<ListResponse<GradeOption>>(`/grades/curriculum/${curriculumId}?page=1&limit=100&isActive=true&fields=name,isActive`),
  allGrades: () => apiRequest<ListResponse<GradeOption>>("/grades?page=1&limit=100&fields=name,isActive,curriculum"),
  createGrade: (body:GradeInput) => apiRequest<{success:true;data:GradeOption}>("/grades", json(body)),
  updateGrade: (id:string, body:Pick<GradeInput,"name">) => apiRequest<{success:true;data:GradeOption}>(`/grades/${id}`, patch(body)),
  deleteGrade: (id:string) => apiRequest<void>(`/grades/${id}`, { method: "DELETE" }),
  subjects: (gradeId:string) => apiRequest<{success:true;data:SubjectOption[]}>(`/grades/${gradeId}/subjects`),
  subjectsByCurriculum: (curriculumId:string) => apiRequest<ListResponse<SubjectOption>>(`/subjects/curriculum/${curriculumId}?page=1&limit=100&fields=name,curriculum,grades`),
  createSubject: (body:SubjectInput) => apiRequest<{success:true;data:SubjectOption}>("/subjects", json(body)),
  updateSubject: (id:string, body:Pick<SubjectInput,"name"|"grades">) => apiRequest<{success:true;data:SubjectOption}>(`/subjects/${id}`, patch(body)),
  deleteSubject: (id:string) => apiRequest<void>(`/subjects/${id}`, { method: "DELETE" }),
  addSubjectsToGrade: (gradeId:string, subjects:string[]) => apiRequest<{success:true;data:GradeOption}>(`/grades/${gradeId}/subjects`, patch({ subjects })),
  packages: (curriculumId:string) => apiRequest<{success:true;data:PackageOption[]}>(`/packages/curriculum/${curriculumId}`),
  createPackage: (body:PackageInput) => apiRequest<{success:true;data:PackageOption}>("/packages", json(body)),
  updatePackage: (id:string, body:PackageInput) => apiRequest<{success:true;data:PackageOption}>(`/packages/${id}`, patch(body)),
  deletePackage: (id:string) => apiRequest<void>(`/packages/${id}`, { method: "DELETE" }),
};
