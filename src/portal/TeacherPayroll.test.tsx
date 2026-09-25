import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherPayroll from "./TeacherPayroll";
import { teacherPayrollApi } from "@/api/teacherPayrollApi";
import { teacherPayrollStatementsApi } from "@/api/teacherPayrollStatementsApi";

vi.mock("@/api/teacherPayrollApi", () => ({
  teacherPayrollApi: { list: vi.fn(), get: vi.fn() },
}));
vi.mock("@/api/teacherPayrollStatementsApi", () => ({
  teacherPayrollStatementsApi: { list: vi.fn(), get: vi.fn(), getReceipt: vi.fn() },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ar", pick: (ar: string) => ar }) }));

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><TeacherPayroll /></MemoryRouter>
  </QueryClientProvider>,
);

describe("TeacherPayroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherPayrollApi.list).mockResolvedValue({ payrolls: [], summary: [] });
    vi.mocked(teacherPayrollStatementsApi.list).mockResolvedValue([{
      id: "statement-1",
      teacher: { id: "teacher-1", fullName: "المعلم", email: null },
      curriculum: { id: "curriculum-1", name: "المنهج المصري" },
      period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-30T00:00:00.000Z" },
      generalSubscription: { hours: 1, details: [], amount: 100 },
      courses: [], bonuses: 0, deductions: 0, finalAmount: 100, currency: "EGP",
      status: "sent", sentAt: "2026-09-30T12:00:00.000Z", payment: null,
      createdAt: "2026-09-30T12:00:00.000Z", updatedAt: "2026-09-30T12:00:00.000Z",
    }]);
  });

  it("renders a non-empty statement list without crashing", async () => {
    renderPage();

    expect(await screen.findByText("المنهج المصري")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "عرض الكشف" })).toHaveAttribute(
      "href",
      "/portal/teacher/payroll-statements/statement-1",
    );
  });
});
