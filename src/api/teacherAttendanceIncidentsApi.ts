import { apiRequest } from "@/api/client";

export interface TeacherAttendancePolicy {
  graceMinutes: number;
  absenceMinutes: number;
  lateDeduction: { EGP: number; SAR: number };
}

export interface TeacherAttendanceIncident {
  id: string;
  occurrenceId: string;
  sessionId: string | null;
  teacher: { id: string; userId: string | null; fullName: string | null };
  classroom: { id: string; name: string | null };
  type: "late" | "absent";
  scheduledStartAt: string;
  actualStartedAt: string | null;
  minutesLate: number;
  deductionAmounts: { EGP: number; SAR: number };
  status: "active" | "waived";
  reviewStatus: "pending" | "approved" | "ignored";
  reviewedAt: string | null;
  reviewedBy: { id: string; fullName: string | null } | null;
  ignoreReason: string | null;
  waivedAt: string | null;
  waiverReason: string | null;
}

export const teacherAttendanceIncidentsApi = {
  getPolicy: async () => (await apiRequest<{ success: true; data: TeacherAttendancePolicy }>("/admin/teacher-attendance/settings")).data,
  updatePolicy: async (body: TeacherAttendancePolicy) => (await apiRequest<{ success: true; data: TeacherAttendancePolicy }>("/admin/teacher-attendance/settings", { method: "PATCH", body: JSON.stringify(body) })).data,
  list: async (filters: { type?: string; status?: string; reviewStatus?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]).toString();
    return (await apiRequest<{ success: true; data: TeacherAttendanceIncident[] }>(`/admin/teacher-attendance${query ? `?${query}` : ""}`)).data;
  },
  get: async (id: string) => (await apiRequest<{ success: true; data: TeacherAttendanceIncident }>(`/admin/teacher-attendance/${encodeURIComponent(id)}`)).data,
  update: async (id: string, body: { decision: "approve" | "ignore"; ignoreReason?: string }) => (await apiRequest<{ success: true; data: TeacherAttendanceIncident }>(`/admin/teacher-attendance/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) })).data,
};
