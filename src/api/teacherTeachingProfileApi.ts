import { apiRequest } from "@/api/client";

export interface TeachingSubject { id: string; name: string; }
export interface TeachingGrade { id: string; name: string; subjects: TeachingSubject[]; }
export interface TeachingCurriculum { id: string; name: string; grades: TeachingGrade[]; }
export interface TeachingProfile { curriculums: TeachingCurriculum[]; }
export interface TeachingProfileInput { curriculums: string[]; assignments: Array<{ grade:string; subjects:string[] }>; }

const endpoint = (teacherId?: string) => teacherId
  ? `/teachers/${teacherId}/teaching-profile`
  : "/teachers/me/teaching-profile";

export const teacherTeachingProfileApi = {
  get: async (teacherId?: string) => (await apiRequest<{ success: true; data: TeachingProfile }>(endpoint(teacherId))).data,
  replace: async (body:TeachingProfileInput, teacherId?:string) => (await apiRequest<{success:true;data:TeachingProfile}>(endpoint(teacherId), { method:"PUT", body:JSON.stringify(body) })).data,
};
