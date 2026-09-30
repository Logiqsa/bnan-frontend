import { apiRequest } from "./client";

export interface ClassroomPlanItem {
  id?: string;
  day?: string | null;
  sessionContent?: string | null;
  sessionAssignment?: string | null;
  attachment?: string | null;
}

export interface ClassroomPlanSubject {
  id: string;
  name: string;
  plans: ClassroomPlanItem[];
}

export interface ClassroomPlansResponse {
  success: true;
  results: number;
  data: {
    classroom: { id: string; name: string };
    week?: number | null;
    subjects: ClassroomPlanSubject[];
  };
}

export interface ClassroomPlanWeeksResponse {
  success: true;
  data: {
    startDate: string | null;
    weeksCount: number;
    completedWeeks: number;
    currentWeek: number;
  };
}

export const classroomPlansApi = {
  getWeeks: (classroomId: string) =>
    apiRequest<ClassroomPlanWeeksResponse>(`/classrooms/${encodeURIComponent(classroomId)}/plans/weeks/elapsed`),
  getWeekly: (classroomId: string, week?: number) =>
    apiRequest<ClassroomPlansResponse>(`/classrooms/${encodeURIComponent(classroomId)}/plans${week ? `?week=${week}` : ""}`),
  getTerm: (classroomId: string) =>
    apiRequest<ClassroomPlansResponse>(`/classrooms/${encodeURIComponent(classroomId)}/plans/term`),
  upload: async (classroomId: string, values: {
    type: "day" | "term";
    subjectId: string;
    day?: string;
    sessionContent?: string;
    sessionAssignment?: string;
    attachment?: File | null;
  }) => {
    const body = new FormData();
    body.append("type", values.type);
    body.append("subjectId", values.subjectId);
    if (values.day) body.append("day", values.day);
    if (values.sessionContent) body.append("sessionContent", values.sessionContent);
    if (values.sessionAssignment) body.append("sessionAssignment", values.sessionAssignment);
    if (values.attachment) body.append("attachment", values.attachment);
    return apiRequest(`/classrooms/${encodeURIComponent(classroomId)}/plans`, { method: "POST", body });
  },
};
