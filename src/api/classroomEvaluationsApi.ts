import { apiRequest } from "@/api/client";

export type EvaluationRating = "excellent" | "very_good" | "good" | "acceptable" | "weak" | "-";
export interface ClassroomEvaluation { id?: string; attendance: string; attendanceAttended?: number | null; attendanceTotal?: number | null; participation: EvaluationRating; homework: EvaluationRating; behavior: EvaluationRating; notes?: string; bonus?: number; }
export interface ClassroomEvaluationSubject { id: string; name: string; status: "evaluated" | "not_evaluated"; evaluation: ClassroomEvaluation | null; }
export interface ClassroomEvaluationStudent { id: string; fullName: string; subjects: ClassroomEvaluationSubject[]; }
export interface ClassroomEvaluationsResponse { data: { classroom: { id: string; name: string }; week: number; weekStart: string; students: ClassroomEvaluationStudent[] } }

export const classroomEvaluationsApi = {
  getWeekly: async (classroomId: string) => (await apiRequest<ClassroomEvaluationsResponse>(`/classrooms/${encodeURIComponent(classroomId)}/evaluations/weekly`)).data,
  save: async (body: { student: string; classroom: string; subject: string; week: number; attendanceAttended: number; attendanceTotal: number; participation: EvaluationRating; homework: EvaluationRating; behavior: EvaluationRating; bonus?: number; notes?: string }) => (await apiRequest<{ success: true; data: ClassroomEvaluation }>("/student-evaluations", { method: "PUT", body: JSON.stringify(body) })).data,
};
