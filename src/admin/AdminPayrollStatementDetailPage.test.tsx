import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminPayrollApi } from "@/api/adminPayrollApi";
import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import AdminPayrollStatementDetailPage from "./AdminPayrollStatementDetailPage";

vi.mock("@/api/adminPayrollApi", () => ({ adminPayrollApi: { getStatement: vi.fn(), updateStatement: vi.fn(), getStatementReceipt: vi.fn() } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ar" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("./TeacherPayrollStatement", () => ({
  default: (props: { actionLabel: string; onRatesChange: (rates: Record<string, string>) => void; onGradeRatesChange: (rates: Record<string, string>) => void; onSend: () => void }) => <div>
    <span>واجهة الكشف الحالية</span>
    <button onClick={() => { props.onGradeRatesChange({ "grade-1": "120" }); props.onRatesChange({ "course-1": "80" }); }}>تغيير الأسعار</button>
    <button onClick={props.onSend}>{props.actionLabel}</button>
  </div>,
}));

const draft: TeacherPayrollStatement = {
  id: "statement-1",
  teacher: { id: "teacher-1", fullName: "Teacher One", email: null },
  curriculum: { id: "curriculum-1", name: "Egyptian" },
  period: { from: "2026-09-01", to: "2026-09-30" },
  generalSubscription: { hours: 1, amount: 100, details: [], gradeGroups: [{ gradeId: "grade-1", gradeName: "Grade 1", hourlyRate: 100, totalHours: 1, totalAmount: 100, sessions: [] }], sessions: [] },
  courses: [{ course: "course-1", courseName: "Course 1", hours: 2, hourlyRate: 50, amount: 100, sessions: [] }],
  bonuses: 10,
  deductions: 5,
  finalAmount: 205,
  currency: "EGP",
  status: "draft",
  sentAt: null,
  payment: null,
  createdAt: "2026-09-30",
  updatedAt: "2026-09-30",
};

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter initialEntries={["/admin/payroll/statements/statement-1?edit=1"]}><Routes><Route path="/admin/payroll/statements/:statementId" element={<AdminPayrollStatementDetailPage />} /></Routes></MemoryRouter></QueryClientProvider>);

describe("AdminPayrollStatementDetailPage editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminPayrollApi.getStatement).mockResolvedValue(draft);
    vi.mocked(adminPayrollApi.updateStatement).mockResolvedValue(draft);
  });

  it("uses the existing statement interface and updates the same draft with changed rates", async () => {
    renderPage();
    expect(await screen.findByText("واجهة الكشف الحالية")).toBeInTheDocument();
    fireEvent.click(screen.getByText("تغيير الأسعار"));
    fireEvent.click(screen.getByText("حفظ التعديلات"));

    await waitFor(() => expect(adminPayrollApi.updateStatement).toHaveBeenCalledWith("statement-1", {
      gradeRates: [{ gradeId: "grade-1", hourlyRate: 120 }],
      courseRates: [{ courseId: "course-1", hourlyRate: 80 }],
      bonuses: 10,
      deductions: 5,
    }));
  });

  it("does not expose the editor for a sent statement", async () => {
    vi.mocked(adminPayrollApi.getStatement).mockResolvedValue({ ...draft, status: "sent", sentAt: "2026-09-30T12:00:00.000Z" });
    renderPage();
    expect(await screen.findByText("الكشف المحفوظ كما تم إرساله")).toBeInTheDocument();
    expect(screen.queryByText("واجهة الكشف الحالية")).not.toBeInTheDocument();
  });
});
