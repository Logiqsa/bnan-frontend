import { apiRequest } from "@/api/client";
import type { TeacherPayroll, TeacherPayrollWorkItem } from "@/api/teacherPayrollApi";

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
