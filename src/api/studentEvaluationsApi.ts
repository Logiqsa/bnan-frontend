import { apiRequest } from "@/api/client";

export type StudentEvaluationAttendance = "present" | "absent" | "late" | "excused";
export type StudentEvaluationRating = "excellent" | "very_good" | "good" | "acceptable" | "weak" | "-";
export type StudentEvaluationRole = "teacher" | "supervisor";

export interface StudentEvaluationValue {
  id: string;
  attendance: StudentEvaluationAttendance;
  participation: StudentEvaluationRating;
  homework: StudentEvaluationRating;
  behavior: StudentEvaluationRating;
  bonus: number;
  bouns: number;
  notes: string;
  createdByRole: StudentEvaluationRole;
  updatedByRole?: StudentEvaluationRole;
  createdAt: string;
  updatedAt: string;
}

interface NamedEntity { id: string; name: string }
interface StudentEntity { id: string }

export interface EgyptianStudentEvaluationsResponse {
  success: true;
  results: number;
  data: {
    student: StudentEntity;
    mode: "egyptian";
    classroom: NamedEntity;
    grade: NamedEntity;
    curriculum: NamedEntity;
    week: number;
    weekStart: string;
    subjects: Array<{
      id: string;
      name: string;
      status: "evaluated" | "not_evaluated";
      evaluation: StudentEvaluationValue | null;
    }>;
  };
}

export interface GulfStudentEvaluationsResponse {
  success: true;
  results: number;
  data: {
    student: StudentEntity;
    mode: "gulf";
    classroomsCount: number;
    classrooms: Array<{
      id: string;
      name: string;
      grade: NamedEntity | null;
      curriculum: NamedEntity | null;
      subject: NamedEntity | null;
      evaluationStatus: "evaluated" | "not_evaluated" | "not_available";
      evaluation: StudentEvaluationValue | null;
    }>;
    week: number;
    weekStart: string;
    subjects: [];
  };
}

export type StudentEvaluationsResponse = EgyptianStudentEvaluationsResponse | GulfStudentEvaluationsResponse;

export interface StudentEvaluationQuery {
  week?: number;
  classroomId?: string;
}

export const studentEvaluationKeys = {
  all: ["student-evaluations", "me"] as const,
  week: (week?: number, classroomId?: string) =>
    ["student-evaluations", "me", { week, classroomId: classroomId ?? null }] as const,
};

export const studentEvaluationsApi = {
  getMyWeeklyEvaluations: async ({ week, classroomId }: StudentEvaluationQuery = {}) => {
    const params = new URLSearchParams();
    if (week !== undefined) params.set("week", String(week));
    if (classroomId?.trim()) params.set("classroomId", classroomId.trim());
    const query = params.toString();
    return apiRequest<StudentEvaluationsResponse>(`/student-evaluations/me${query ? `?${query}` : ""}`);
  },
};
