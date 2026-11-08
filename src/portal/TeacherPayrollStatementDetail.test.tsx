import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { teacherPayrollStatementsApi, type TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import TeacherPayrollStatementDetail from "./TeacherPayrollStatementDetail";

vi.mock("@/api/teacherPayrollStatementsApi", async (original) => ({
  ...(await original<typeof import("@/api/teacherPayrollStatementsApi")>()),
  teacherPayrollStatementsApi: { list: vi.fn(), get: vi.fn(), getReceipt: vi.fn() },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ar", pick: (ar: string) => ar }) }));

const statement: TeacherPayrollStatement = {
  id: "statement-1",
  teacher: { id: "teacher-1", fullName: "محمد أحمد", email: "teacher@example.com" },
  curriculum: { id: "curriculum-1", name: "المنهج المصري" },
  period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-30T23:59:59.999Z" },
  generalSubscription: { hours: 1, amount: 100, details: [], gradeGroups: [], sessions: [] },
  courses: [{ course: "course-1", courseName: "دورة تجريبية", hours: 1, hourlyRate: 50, amount: 50, sessions: [] }],
  bonuses: 10,
  deductions: 5,
  deductionItems: [{
    source: "automatic_late",
    incident: "incident-1",
    reason: "تأخير 8 دقائق",
    amount: 5,
    occurredAt: "2026-09-10T09:00:00.000Z",
    minutesLate: 8,
    classroomName: "الصف الأول",
    curriculumName: "المنهج المصري",
  }],
  finalAmount: 155, currency: "EGP", status: "sent",
  sentAt: "2026-09-30T12:00:00.000Z", payment: null,
  createdAt: "2026-09-30T12:00:00.000Z", updatedAt: "2026-09-30T12:00:00.000Z",
};

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={["/portal/teacher/payroll-statements/statement-1"]}>
      <Routes><Route path="/portal/teacher/payroll-statements/:statementId" element={<TeacherPayrollStatementDetail />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe("TeacherPayrollStatementDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teacherPayrollStatementsApi.get).mockResolvedValue(statement);
    vi.spyOn(window, "print").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:payment-receipt") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("downloads the saved statement through the agreed printable layout", async () => {
    renderPage();

    const download = await screen.findByRole("button", { name: "تحميل الكشف" });
    expect(screen.getByTestId("statement-print")).toHaveTextContent("التقرير المالي");
    expect(screen.getByTestId("statement-print")).toHaveTextContent("تفاصيل الخصومات");
    expect(screen.getByTestId("statement-print")).toHaveTextContent("الصف الأول");
    expect(screen.getByTestId("statement-print")).toHaveTextContent("محمد أحمد");
    expect(screen.getByTestId("statement-print")).toHaveTextContent("المنهج المصري");

    fireEvent.click(download);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("loads the payment receipt as a compact thumbnail and opens it inside the site", async () => {
    vi.mocked(teacherPayrollStatementsApi.get).mockResolvedValue({
      ...statement,
      status: "paid",
      payment: {
        amount: 155,
        currency: "EGP",
        method: "wallet",
        methodSnapshot: { method: "wallet", accountHolderName: "محمد أحمد", walletPhone: "01000000000" },
        paymentReference: null,
        paidAt: "2026-10-01T12:00:00.000Z",
        hasReceipt: true,
      },
    });
    vi.mocked(teacherPayrollStatementsApi.getReceipt).mockResolvedValue(new Blob(["receipt"], { type: "image/png" }));

    renderPage();

    const thumbnail = await screen.findByRole("button", { name: "معاينة إيصال الدفع" });
    await waitFor(() => expect(within(thumbnail).getByRole("img", { name: "إيصال الدفع" })).toHaveAttribute("src", "blob:payment-receipt"));
    expect(teacherPayrollStatementsApi.getReceipt).toHaveBeenCalledWith("statement-1");

    fireEvent.click(thumbnail);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "إيصال الدفع" })).toHaveAttribute("src", "blob:payment-receipt");
    expect(within(dialog).getByText("معاينة الإيصال داخل الموقع")).toBeInTheDocument();
  });
});
