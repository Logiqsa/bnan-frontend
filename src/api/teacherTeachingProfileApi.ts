import { apiRequest } from "@/api/client";

export interface TeachingSubject { id: string; name: string; }
export interface TeachingGrade { id: string; name: string; subjects: TeachingSubject[]; }
export interface TeachingCurriculum { id: string; name: string; grades: TeachingGrade[]; }

export const teacherTeachingProfileApi = {
  get: async () => (await apiRequest<{ success: true; data: { curriculums: TeachingCurriculum[] } }>("/teachers/me/teaching-profile")).data,
};
