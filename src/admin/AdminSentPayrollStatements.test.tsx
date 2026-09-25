import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminPayrollApi } from "@/api/adminPayrollApi";
import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import AdminSentPayrollStatements from "./AdminSentPayrollStatements";

vi.mock("@/api/adminPayrollApi", () => ({
  adminPayrollApi: {
    listStatements: vi.fn(),
    getStatement: vi.fn(),
    deleteStatement: vi.fn(),
    payStatement: vi.fn(),
    getStatementReceipt: vi.fn(),
  },
}));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "ar" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const statement = (id: string, status: TeacherPayrollStatement["status"], teacherName: string): TeacherPayrollStatement => ({
  id,
  teacher: { id: `teacher-${id}`, fullName: teacherName, email: null },
  curriculum: { id: "curriculum-1", name: "المنهج المصري" },
  period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-30T23:59:59.999Z" },
  generalSubscription: { hours: 1, details: [], amount: 100 },
  courses: [],
  bonuses: 0,
  deductions: 0,
  finalAmount: 100,
  currency: "EGP",
  status,
  sentAt: status === "draft" ? null : "2026-09-30T12:00:00.000Z",
  payment: status === "paid" ? {
    amount: 100,
    currency: "EGP",
    method: "instapay",
    methodSnapshot: { method: "instapay", accountHolderName: teacherName, instapayAddress: "teacher@instapay" },
    paymentReference: null,
    paidAt: "2026-10-01T12:00:00.000Z",
    hasReceipt: false,
  } : null,
  createdAt: "2026-09-30T12:00:00.000Z",
  updatedAt: "2026-09-30T12:00:00.000Z",
});

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter><AdminSentPayrollStatements /></MemoryRouter>
  </QueryClientProvider>,
);

describe("AdminSentPayrollStatements deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminPayrollApi.listStatements)
      .mockResolvedValueOnce([
        statement("draft-1", "draft", "معلم مسودة"),
        statement("sent-1", "sent", "معلم مرسل"),
        statement("paid-1", "paid", "معلم مدفوع"),
      ])
      .mockResolvedValue([
        statement("sent-1", "sent", "معلم مرسل"),
        statement("paid-1", "paid", "معلم مدفوع"),
      ]);
    vi.mocked(adminPayrollApi.deleteStatement).mockResolvedValue({ id: "draft-1" });
  });

  it("restores the original statement actions and keeps draft editing", async () => {
    renderPage();

    const draftRow = (await screen.findByText("معلم مسودة")).closest("tr")!;
    const sentRow = screen.getByText("معلم مرسل").closest("tr")!;
    const paidRow = screen.getByText("معلم مدفوع").closest("tr")!;

    expect(within(draftRow).getByRole("link", { name: "عرض الكشف" })).toHaveAttribute("href", "/admin/payroll/statements/draft-1");
    expect(within(draftRow).getByRole("link", { name: "تعديل الكشف" })).toHaveAttribute("href", "/admin/payroll/statements/draft-1?edit=1");
    expect(within(draftRow).getByRole("button", { name: "إرسال الراتب" })).toBeEnabled();
    expect(within(draftRow).getByRole("button", { name: /حذف الكشف/ })).toBeEnabled();

    expect(within(sentRow).getByRole("link", { name: "عرض الكشف" })).toHaveAttribute("href", "/admin/payroll/statements/sent-1");
    expect(within(sentRow).queryByRole("link", { name: "تعديل الكشف" })).not.toBeInTheDocument();
    expect(within(sentRow).getByRole("button", { name: "إرسال الراتب" })).toBeEnabled();
    expect(within(sentRow).getByRole("button", { name: /حذف الكشف/ })).toBeEnabled();

    expect(within(paidRow).getByRole("link", { name: "عرض الكشف" })).toHaveAttribute("href", "/admin/payroll/statements/paid-1");
    expect(within(paidRow).queryByRole("link", { name: "تعديل الكشف" })).not.toBeInTheDocument();
    expect(within(paidRow).queryByRole("button", { name: "إرسال الراتب" })).not.toBeInTheDocument();
    expect(within(paidRow).getByRole("button", { name: /حذف الكشف/ })).toBeDisabled();
  });

  it("requires confirmation, allows cancellation, and removes the row after success", async () => {
    renderPage();
    const draftRow = (await screen.findByText("معلم مسودة")).closest("tr")!;
    fireEvent.click(within(draftRow).getByRole("button", { name: /حذف الكشف/ }));

    let dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("هل أنت متأكد من حذف هذا الكشف؟")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "إلغاء" }));
    expect(adminPayrollApi.deleteStatement).not.toHaveBeenCalled();

    fireEvent.click(within(draftRow).getByRole("button", { name: /حذف الكشف/ }));
    dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "حذف الكشف" }));

    await waitFor(() => expect(adminPayrollApi.deleteStatement).toHaveBeenCalledWith("draft-1"));
    await waitFor(() => expect(screen.queryByText("معلم مسودة")).not.toBeInTheDocument());
    expect(screen.getByText("معلم مرسل")).toBeInTheDocument();
    expect(screen.getByText("معلم مدفوع")).toBeInTheDocument();
  });
});
