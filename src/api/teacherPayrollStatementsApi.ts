import { apiRequest } from "@/api/client";

export type TeacherPayrollStatementStatus = "draft" | "sent" | "payment_pending" | "paid" | "cancelled";
export type PayoutMethod = "wallet" | "bank_account" | "instapay";

export interface PayoutProfile {
  method: PayoutMethod;
  accountHolderName: string;
  walletProvider?: string;
  walletPhone?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  instapayAddress?: string;
}

export interface TeacherPayrollStatement {
  id: string;
  teacher: { id: string; fullName: string | null; email: string | null };
  curriculum: { id: string; name: string | null };
  period: { from: string; to: string };
  generalSubscription: { hours: number; details: unknown[]; amount: number; gradeGroups?: AcademicGradeGroup[]; sessions?: StatementSession[] };
  courses: Array<{ course: string; courseName: string; hours: number; hourlyRate: number; amount: number; sessions?: StatementSession[] }>;
  bonuses: number;
  deductions: number;
  finalAmount: number;
  currency: string;
  status: TeacherPayrollStatementStatus;
  sentAt: string | null;
  payment: {
    amount: number;
    currency: string;
    method: PayoutMethod;
    methodSnapshot: PayoutProfile;
    paymentReference: string | null;
    paidAt: string;
    paidBy?: string;
    hasReceipt: boolean;
  } | null;
  payoutProfile?: PayoutProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatementSession {
  sessionId: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  subject?: string | null;
  gradeId?: string | null;
  gradeName?: string | null;
  hourlyRate: number | null;
  amount: number | null;
  sourceType?: string | null;
}

export interface AcademicGradeGroup {
  gradeId: string;
  gradeName: string;
  hourlyRate: number | null;
  totalHours: number;
  totalAmount: number;
  sessions: StatementSession[];
}

export const teacherPayrollStatementsApi = {
  list: async () => (await apiRequest<{ success: true; data: TeacherPayrollStatement[] }>("/teachers/me/payroll-statements")).data,
  get: async (id: string) => (await apiRequest<{ success: true; data: TeacherPayrollStatement }>(`/teachers/me/payroll-statements/${encodeURIComponent(id)}`)).data,
  getReceipt: async (id: string) => apiRequest<Blob>(`/teachers/me/payroll-statements/${encodeURIComponent(id)}/payment/receipt`, { responseType: "blob" }),
};
