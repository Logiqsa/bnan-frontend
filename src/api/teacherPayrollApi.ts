import { apiRequest } from "@/api/client";

export type TeacherPayrollStatus = "draft" | "paid";

export interface TeacherPayrollSummary {
  currency: string;
  draftAmount: number;
  paidAmount: number;
  totalAmount: number;
  payrollsCount: number;
}

export interface TeacherPayrollWorkItem {
  curriculumId: string;
  curriculumName: string;
  gradeId?: string;
  gradeName?: string;
  system: "gulf" | "egyptian";
  rateType: "hour" | "session";
  minutes: number | null;
  displayDuration: string | null;
  sessionsCount: number;
  rate: number;
  amount: number;
}

export interface TeacherPayroll {
  id: string;
  teacher: { id: string; fullName?: string | null; email?: string | null; phone?: string | null };
  period: { from: string; to: string };
  currency: string;
  status: TeacherPayrollStatus;
  workItems: TeacherPayrollWorkItem[];
  totals: {
    gulfAmount: number;
    egyptianAmount: number;
    subtotal: number;
    bonus: number;
    deduction: number;
    total: number;
  };
  adjustmentNote: string | null;
  notes: string | null;
  payment: {
    method: "wallet" | "bank_account" | "instapay";
    paidAt?: string;
    transactionReference?: string;
    receiptUrl?: string;
    notes?: string;
    paidAmount?: number;
    destinationSnapshot?: Record<string, unknown>;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherPayrollList {
  summary: TeacherPayrollSummary[];
  payrolls: TeacherPayroll[];
}

export const teacherPayrollApi = {
  list: async (status?: TeacherPayrollStatus) => {
    const query = status ? `?status=${status}` : "";
    const response = await apiRequest<{
      success: true;
      results: number;
      data: TeacherPayrollList;
    }>(`/teachers/me/payrolls${query}`);
    return response.data;
  },
  get: async (payrollId: string) => {
    const response = await apiRequest<{ success: true; data: TeacherPayroll }>(
      `/teachers/me/payrolls/${encodeURIComponent(payrollId)}`,
    );
    return response.data;
  },
};
