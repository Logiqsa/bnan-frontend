import { apiRequest } from "@/api/client";
import type { TeacherPayroll, TeacherPayrollWorkItem } from "@/api/teacherPayrollApi";
import type { AcademicGradeGroup, StatementSession, TeacherPayrollStatement, TeacherPayrollStatementStatus } from "@/api/teacherPayrollStatementsApi";
import type { PayrollStatementCurrency } from "@/lib/payrollStatementCurrency";

export type AdminPayrollStatus = "draft" | "paid" | "cancelled";
export type AdminPayroll = Omit<TeacherPayroll, "status"> & { status: AdminPayrollStatus };

export interface PayrollPreviewTeacher {
  teacherId: string;
  fullName: string | null;
  email: string | null;
  systems: Array<"gulf" | "egyptian">;
  gulf: { minutes: number; displayDuration: string };
  egyptian: { minutes: number; displayDuration: string; sessionsCount: number };
  gradesCount: number;
  curriculumsCount: number;
  excludedSessionsCount: number;
  excludedSessions: ExcludedPayrollSession[];
  payrollStatus: AdminPayrollStatus | "unprepared";
  payrollId: string | null;
}

export interface PayrollTeacherPreview {
  teacher: { id: string; fullName: string | null; email: string | null; phone: string | null };
  period: { from: string; to: string };
  summary: {
    gulfMinutes: number;
    gulfDisplayDuration: string;
    egyptianMinutes: number;
    egyptianDisplayDuration: string;
    egyptianSessionsCount: number;
    gradesCount: number;
    curriculumsCount: number;
    excludedSessionsCount: number;
  };
  workItems: Array<Omit<TeacherPayrollWorkItem, "rate" | "amount"> & { rate: null; amount: null }>;
  payoutProfile: Record<string, unknown> | null;
  warnings: Array<{ code: string; count: number }>;
  excludedSessions: ExcludedPayrollSession[];
}

export interface ExcludedPayrollSession {
  sessionId: string;
  teacherId: string;
  date: string | null;
  classroomId: string | null;
  sourceType: string | null;
  courseId?: string;
  courseName?: string;
  exclusionReason: string;
}

export interface PayrollStatementTeacher {
  teacherId: string;
  fullName: string | null;
  email: string | null;
  general: { minutes: number; displayDuration: string; sessionsCount: number; items: Array<Omit<TeacherPayrollWorkItem, "rate" | "amount"> & { rate: null; amount: null }>; gradeGroups?: AcademicGradeGroup[]; sessions?: StatementSession[] };
  courses: Array<{ courseId: string; courseName: string; minutes: number; displayDuration: string; sessionsCount: number; sessions?: StatementSession[] }>;
  excludedSessionsCount: number;
  excludedSessions: ExcludedPayrollSession[];
  payroll: { id: string; status: AdminPayrollStatus; currency: string; bonus: number; deduction: number; total: number; generalAmount: number } | null;
}

export interface PayrollStatementPreview {
  curriculum: { id: string; name: string };
  period: { from: string; to: string };
  teachers: PayrollStatementTeacher[];
}

export interface PayrollDraftInput {
  rates: Array<{ gradeId: string; rate: number }>;
  currency: string;
  bonus: number;
  deduction: number;
  adjustmentNote?: string;
  notes?: string;
}

export const adminPayrollApi = {
  list: async (filters: { status?: string; teacherId?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.status) query.set("status", filters.status);
    if (filters.teacherId) query.set("teacherId", filters.teacherId);
    const serialized = query.toString();
    const suffix = serialized ? `?${serialized}` : "";
    return (await apiRequest<{ success: true; data: AdminPayroll[] }>(`/admin/payrolls${suffix}`)).data;
  },
  get: async (id: string) =>
    (await apiRequest<{ success: true; data: AdminPayroll }>(`/admin/payrolls/${encodeURIComponent(id)}`)).data,
  allTeachersPreview: async (from: string, to: string) => {
    const query = new URLSearchParams({ from, to });
    return (await apiRequest<{ success: true; data: { period: { from: string; to: string }; teachers: PayrollPreviewTeacher[] } }>(`/admin/payrolls/preview?${query}`)).data;
  },
  teacherPreview: async (teacherId: string, from: string, to: string) => {
    const query = new URLSearchParams({ from, to });
    return (await apiRequest<{ success: true; data: PayrollTeacherPreview }>(`/admin/payrolls/teachers/${encodeURIComponent(teacherId)}/preview?${query}`)).data;
  },
  curriculumStatementPreview: async (curriculumId: string, from: string, to: string) => {
    const query = new URLSearchParams({ curriculumId, from, to });
    return (await apiRequest<{ success: true; data: PayrollStatementPreview }>(`/admin/payrolls/statement-preview?${query}`)).data;
  },
  createStatement: async (body: { teacherId: string; curriculumId: string; from: string; to: string; currency: PayrollStatementCurrency; generalAmount?: number; bonuses?: number; deductions?: number; gradeRates?: Array<{ gradeId: string; hourlyRate: number }>; courseRates: Array<{ courseId: string; hourlyRate: number }> }) =>
    (await apiRequest<{ success: true; data: TeacherPayrollStatement }>("/admin/payrolls/statements", { method: "POST", body: JSON.stringify(body) })).data,
  listStatements: async (filters: { teacher?: string; curriculum?: string; status?: TeacherPayrollStatementStatus } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as string[][]);
    const suffix = query.toString() ? `?${query}` : "";
    return (await apiRequest<{ success: true; data: TeacherPayrollStatement[] }>(`/admin/payrolls/statements${suffix}`)).data;
  },
  getStatement: async (id: string) => (await apiRequest<{ success: true; data: TeacherPayrollStatement }>(`/admin/payrolls/statements/${encodeURIComponent(id)}`)).data,
  updateStatement: async (id: string, body: { gradeRates: Array<{ gradeId: string; hourlyRate: number }>; courseRates: Array<{ courseId: string; hourlyRate: number }>; bonuses?: number; deductions?: number }) =>
    (await apiRequest<{ success: true; data: TeacherPayrollStatement }>(`/admin/payrolls/statements/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) })).data,
  sendStatement: async (id: string) => (await apiRequest<{ success: true; data: TeacherPayrollStatement }>(`/admin/payrolls/statements/${encodeURIComponent(id)}/send`, { method: "POST" })).data,
  deleteStatement: async (id: string) => (await apiRequest<{ success: true; data: { id: string } }>(`/admin/payrolls/statements/${encodeURIComponent(id)}`, { method: "DELETE" })).data,
  payStatement: async (id: string, input: { receipt: File; paidAt?: string; paymentReference?: string }) => {
    const form = new FormData(); form.append("receipt", input.receipt); if (input.paidAt) form.append("paidAt", input.paidAt); if (input.paymentReference) form.append("paymentReference", input.paymentReference);
    return (await apiRequest<{ success: true; data: TeacherPayrollStatement }>(`/admin/payrolls/statements/${encodeURIComponent(id)}/payment`, { method: "POST", body: form })).data;
  },
  getStatementReceipt: async (id: string) => apiRequest<Blob>(`/admin/payrolls/statements/${encodeURIComponent(id)}/payment/receipt`, { responseType: "blob" }),
  create: async (body: PayrollDraftInput & { teacherId: string; period: { from: string; to: string } }) =>
    (await apiRequest<{ success: true; data: AdminPayroll }>("/admin/payrolls", {
      method: "POST", body: JSON.stringify(body),
    })).data,
  update: async (id: string, body: PayrollDraftInput) =>
    (await apiRequest<{ success: true; data: AdminPayroll }>(`/admin/payrolls/${encodeURIComponent(id)}`, {
      method: "PATCH", body: JSON.stringify(body),
    })).data,
  pay: async (id: string, input: { receipt: File; paidAt?: string; transactionReference?: string; notes?: string }) => {
    const form = new FormData();
    form.append("transferReceipt", input.receipt);
    if (input.paidAt) form.append("paidAt", input.paidAt);
    if (input.transactionReference?.trim()) form.append("transactionReference", input.transactionReference.trim());
    if (input.notes?.trim()) form.append("notes", input.notes.trim());
    return (await apiRequest<{ success: true; data: AdminPayroll }>(`/admin/payrolls/${encodeURIComponent(id)}/pay`, {
      method: "POST", body: form,
    })).data;
  },
};
