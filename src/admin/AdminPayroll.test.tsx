import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPayroll, { AdminTeacherPayrollStatementPage, DraftEditor } from "./AdminPayroll";
import { adminPayrollApi } from "@/api/adminPayrollApi";
import type { PayrollTeacherPreview } from "@/api/adminPayrollApi";
import type { TeacherPayrollStatement } from "@/api/teacherPayrollStatementsApi";
import { catalogApi } from "@/api/catalogApi";

vi.mock("@/api/adminPayrollApi", async (original) => ({
  ...(await original<typeof import("@/api/adminPayrollApi")>()),
  adminPayrollApi: { list: vi.fn(), get: vi.fn(), allTeachersPreview: vi.fn(), teacherPreview: vi.fn(), curriculumStatementPreview: vi.fn(), createStatement: vi.fn(), listStatements: vi.fn(), getStatement: vi.fn(), updateStatement: vi.fn(), sendStatement: vi.fn(), deleteStatement: vi.fn(), payStatement: vi.fn(), getStatementReceipt: vi.fn(), create: vi.fn(), update: vi.fn(), pay: vi.fn() },
}));
vi.mock("@/api/catalogApi", () => ({ catalogApi: { curriculums: vi.fn() } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/i18n/LanguageContext", () => ({ useLanguage: () => ({ language: "en", pick: (_ar: string, en: string) => en }) }));
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
});

const payroll = {
  id: "payroll-1", teacher: { id: "teacher-1", fullName: "Teacher One", email: "teacher@example.com" },
  period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-30T23:59:59.999Z" }, currency: "SAR", status: "paid" as const,
  workItems: [], totals: { gulfAmount: 0, egyptianAmount: 100, subtotal: 100, bonus: 0, deduction: 0, total: 100 },
  adjustmentNote: null, notes: null, payment: null, createdAt: "2026-09-30T00:00:00.000Z", updatedAt: "2026-09-30T00:00:00.000Z",
};

const multiGradePreview: PayrollTeacherPreview = {
  teacher: { id: "teacher-1", fullName: "Teacher One", email: null, phone: null },
  period: { from: "2026-09-01", to: "2026-09-30" },
  summary: { gulfMinutes: 240, gulfDisplayDuration: "4h", egyptianMinutes: 100, egyptianDisplayDuration: "1h 40m", egyptianSessionsCount: 5, gradesCount: 2, curriculumsCount: 2, excludedSessionsCount: 0 },
  workItems: [
    { curriculumId: "curriculum-1", curriculumName: "Egyptian curriculum", gradeId: "grade-1", gradeName: "First grade", system: "egyptian", rateType: "session", minutes: null, displayDuration: null, sessionsCount: 5, rate: null, amount: null },
    { curriculumId: "curriculum-2", curriculumName: "Saudi curriculum", gradeId: "grade-2", gradeName: "Second grade", system: "gulf", rateType: "hour", minutes: 240, displayDuration: "4h", sessionsCount: 3, rate: null, amount: null },
  ],
  payoutProfile: null,
  warnings: [],
};

const savedStatement = (id: string, teacherId: string, status: TeacherPayrollStatement["status"]): TeacherPayrollStatement => ({
  id,
  teacher: { id: teacherId, fullName: teacherId, email: null },
  curriculum: { id: "another-curriculum", name: "Another curriculum" },
  period: { from: "2026-09-01T00:00:00.000Z", to: "2026-09-26T23:59:59.999Z" },
  generalSubscription: { hours: 0, details: [], amount: 0 },
  courses: [], bonuses: 0, deductions: 0, finalAmount: 0, currency: "SAR",
  status, sentAt: status === "draft" ? null : "2026-09-26T12:00:00.000Z", payment: null,
  createdAt: "2026-09-26T12:00:00.000Z", updatedAt: "2026-09-26T12:00:00.000Z",
});

const renderPage = (path = "/admin/payroll") => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/admin/payroll" element={<AdminPayroll />} />
      <Route path="/admin/payroll/statement" element={<AdminTeacherPayrollStatementPage />} />
      <Route path="/admin/payroll/:payrollId" element={<AdminPayroll />} />
    </Routes></MemoryRouter>
  </QueryClientProvider>,
);

describe("AdminPayroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminPayrollApi.listStatements).mockResolvedValue([]);
    vi.mocked(adminPayrollApi.curriculumStatementPreview).mockResolvedValue({ curriculum: { id: "curriculum-1", name: "Egyptian" }, period: { from: "2026-09-01", to: "2026-09-30" }, teachers: [] });
    vi.mocked(catalogApi.curriculums).mockResolvedValue({ success: true, results: 2, data: [{ id: "curriculum-1", name: "Egyptian", registrationMode: "egyptian" }, { id: "curriculum-2", name: "Saudi", registrationMode: "gulf" }] });
  });

  it("renders an empty payroll list", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No payrolls found.")).toBeInTheDocument();
  });

  it("opens sent statements from the top tabs without rendering the long create area", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Sent statements" }));

    expect(await screen.findByText("الكشوفات المرسلة")).toBeInTheDocument();
    expect(screen.getByText("لا توجد كشوفات مرسلة حتى الآن.")).toBeInTheDocument();
    expect(screen.queryByText("Create draft")).not.toBeInTheDocument();
  });

  it("renders payroll list data", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([payroll]);
    renderPage();
    expect(await screen.findByText("Teacher One")).toBeInTheDocument();
    expect(screen.getByText("100 SAR")).toBeInTheDocument();
  });

  it("renders the list error state", async () => {
    vi.mocked(adminPayrollApi.list).mockRejectedValue(new Error("failed"));
    renderPage();
    expect(await screen.findByText("Unable to load payrolls.")).toBeInTheDocument();
  });

  it("renders payroll details", async () => {
    vi.mocked(adminPayrollApi.get).mockResolvedValue(payroll);
    renderPage("/admin/payroll/payroll-1");
    expect(await screen.findByText("Payroll details")).toBeInTheDocument();
    expect(screen.getByText("Teacher One")).toBeInTheDocument();
  });

  it("renders the detail error state", async () => {
    vi.mocked(adminPayrollApi.get).mockRejectedValue(new Error("failed"));
    renderPage("/admin/payroll/payroll-1");
    await waitFor(() => expect(screen.getByText("Unable to load payroll.")).toBeInTheDocument());
  });

  it("opens the selected teacher statement on a separate page", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    vi.mocked(adminPayrollApi.curriculumStatementPreview).mockResolvedValue({
      curriculum: { id: "curriculum-1", name: "Egyptian" },
      period: { from: "2026-09-01", to: "2026-09-30" },
      teachers: [{ teacherId: "teacher-internal-id", fullName: "Named Teacher", email: null, general: { minutes: 0, displayDuration: "0h", sessionsCount: 0, items: [] }, courses: [], excludedSessionsCount: 1, excludedSessions: [], payroll: null }],
    });
    renderPage();
    fireEvent.click(screen.getByText("New payroll"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-30" } });
    fireEvent.change(await screen.findByLabelText("Curriculum"), { target: { value: "curriculum-1" } });
    fireEvent.click(await screen.findByText("عرض الكشف"));
    expect((await screen.findAllByText("كشف مستحقات المعلم")).length).toBeGreaterThan(0);
  });

  it("removes the teacher dropdown and keeps curriculum selection", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    vi.mocked(adminPayrollApi.allTeachersPreview).mockResolvedValue({
      period: { from: "2026-09-01", to: "2026-09-30" },
      teachers: [
        { teacherId: "teacher-internal-id", fullName: "Named Teacher", email: null, systems: [], gulf: { minutes: 0, displayDuration: "0h" }, egyptian: { minutes: 0, displayDuration: "0h", sessionsCount: 0 }, gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 0, payrollStatus: "unprepared", payrollId: null },
        { teacherId: "teacher-2", fullName: "Saudi Teacher", email: null, systems: [], gulf: { minutes: 0, displayDuration: "0h" }, egyptian: { minutes: 0, displayDuration: "0h", sessionsCount: 0 }, gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 0, payrollStatus: "unprepared", payrollId: null },
      ],
    });
    renderPage();
    fireEvent.click(screen.getByText("New payroll"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-30" } });
    const curriculumSelector = await screen.findByLabelText("Curriculum");
    expect(screen.queryByLabelText("Teacher")).not.toBeInTheDocument();
    fireEvent.change(curriculumSelector, { target: { value: "curriculum-2" } });
    expect(curriculumSelector).toHaveValue("curriculum-2");
    fireEvent.change(curriculumSelector, { target: { value: "all" } });
    expect(curriculumSelector).toHaveValue("all");
  });

  it("lists all curriculum teachers and opens an individual statement", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    vi.mocked(adminPayrollApi.allTeachersPreview).mockResolvedValue({ period: { from: "2026-09-01", to: "2026-09-30" }, teachers: [] });
    vi.mocked(adminPayrollApi.curriculumStatementPreview).mockResolvedValue({
      curriculum: { id: "curriculum-1", name: "Egyptian" },
      period: { from: "2026-09-01", to: "2026-09-30" },
      teachers: [
        { teacherId: "teacher-1", fullName: "Teacher One", email: null, general: { minutes: 120, displayDuration: "2h", sessionsCount: 2, items: [] }, courses: [{ courseId: "course-1", courseName: "Math", minutes: 60, displayDuration: "1h", sessionsCount: 1 }], excludedSessionsCount: 0, excludedSessions: [], payroll: null },
        { teacherId: "teacher-2", fullName: "Teacher Two", email: null, general: { minutes: 0, displayDuration: "0h", sessionsCount: 0, items: [] }, courses: [], excludedSessionsCount: 0, excludedSessions: [], payroll: null },
      ],
    });
    renderPage();
    fireEvent.click(screen.getByText("New payroll"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-30" } });
    fireEvent.change(await screen.findByLabelText("Curriculum"), { target: { value: "curriculum-1" } });
    expect(await screen.findByText("Teacher One")).toBeInTheDocument();
    expect(screen.getByText("Teacher Two")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("عرض الكشف")[0]);
    expect(screen.getAllByText("كشف مستحقات المعلم").length).toBeGreaterThan(0);
    fireEvent.change(await screen.findByLabelText("العملة"), { target: { value: "EGP" } });
    expect(screen.getByText("Math")).toBeInTheDocument();
  });

  it("marks teachers with an existing statement unavailable for the same period", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    vi.mocked(adminPayrollApi.listStatements).mockResolvedValue([
      savedStatement("draft-1", "teacher-draft", "draft"),
      savedStatement("sent-1", "teacher-sent", "sent"),
      savedStatement("paid-1", "teacher-paid", "paid"),
    ]);
    vi.mocked(adminPayrollApi.curriculumStatementPreview).mockResolvedValue({
      curriculum: { id: "curriculum-1", name: "Egyptian" },
      period: { from: "2026-09-01", to: "2026-09-26" },
      teachers: [
        { teacherId: "teacher-available", fullName: "Available Teacher", email: null, general: { minutes: 0, displayDuration: "0h", sessionsCount: 0, items: [] }, courses: [], excludedSessionsCount: 0, excludedSessions: [], payroll: null },
        { teacherId: "teacher-draft", fullName: "Draft Teacher", email: null, general: { minutes: 0, displayDuration: "0h", sessionsCount: 0, items: [] }, courses: [], excludedSessionsCount: 0, excludedSessions: [], payroll: null },
        { teacherId: "teacher-sent", fullName: "Sent Teacher", email: null, general: { minutes: 0, displayDuration: "0h", sessionsCount: 0, items: [] }, courses: [], excludedSessionsCount: 0, excludedSessions: [], payroll: null },
        { teacherId: "teacher-paid", fullName: "Paid Teacher", email: null, general: { minutes: 0, displayDuration: "0h", sessionsCount: 0, items: [] }, courses: [], excludedSessionsCount: 0, excludedSessions: [], payroll: null },
      ],
    });

    renderPage();
    fireEvent.click(screen.getByText("New payroll"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-26" } });
    fireEvent.change(await screen.findByLabelText("Curriculum"), { target: { value: "curriculum-1" } });

    const availableRow = (await screen.findByText("Available Teacher")).closest("tr")!;
    const draftRow = screen.getByText("Draft Teacher").closest("tr")!;
    const sentRow = screen.getByText("Sent Teacher").closest("tr")!;
    const paidRow = screen.getByText("Paid Teacher").closest("tr")!;

    expect(within(availableRow).getByText("متاح")).toBeInTheDocument();
    expect(within(availableRow).getByRole("button", { name: "عرض الكشف" })).toBeEnabled();
    expect(within(draftRow).getByText("Period overlaps an existing statement")).toBeInTheDocument();
    expect(within(draftRow).getByText("Existing draft")).toBeInTheDocument();
    expect(within(draftRow).getByRole("link", { name: "عرض الكشف" })).toHaveAttribute("href", "/admin/payroll/statements/draft-1");
    expect(within(sentRow).getByText("Period overlaps an existing statement")).toBeInTheDocument();
    expect(within(sentRow).getByText("Already sent")).toBeInTheDocument();
    expect(within(sentRow).getByRole("link", { name: "عرض الكشف" })).toHaveAttribute("href", "/admin/payroll/statements/sent-1");
    expect(within(paidRow).getByText("Period overlaps an existing statement")).toBeInTheDocument();
    expect(within(paidRow).getByText("Paid")).toBeInTheDocument();
    expect(within(paidRow).getByRole("link", { name: "عرض الكشف" })).toHaveAttribute("href", "/admin/payroll/statements/paid-1");
  });

  it("requires a statement currency and saves the selected SAR draft currency", async () => {
    vi.mocked(adminPayrollApi.curriculumStatementPreview).mockResolvedValue({
      curriculum: { id: "curriculum-1", name: "Egyptian" },
      period: { from: "2026-09-01", to: "2026-09-30" },
      teachers: [{ teacherId: "teacher-1", fullName: "Teacher One", email: null, general: { minutes: 60, displayDuration: "1h", sessionsCount: 1, items: [] }, courses: [], excludedSessionsCount: 0, excludedSessions: [], payroll: null }],
    });
    vi.mocked(adminPayrollApi.createStatement).mockResolvedValue({} as never);
    renderPage("/admin/payroll/statement?curriculumId=curriculum-1&from=2026-09-01&to=2026-09-30&teacherId=teacher-1");
    expect(await screen.findByText("اختر العملة بجوار إدخال السعر لعرض الكشف وحفظ المسودة.")).toBeInTheDocument();
    expect(screen.getByText("حفظ المسودة")).toBeDisabled();
    expect(screen.getByLabelText("العملة").closest("section")).toHaveTextContent("أسعار ساعات الدورات");
    fireEvent.change(screen.getByLabelText("العملة"), { target: { value: "SAR" } });
    expect((await screen.findAllByText("ريال سعودي (ر.س)")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("حفظ المسودة"));
    fireEvent.click(screen.getByRole("button", { name: "حفظ المسودة" }));
    await waitFor(() => expect(adminPayrollApi.createStatement).toHaveBeenCalledWith(expect.objectContaining({ currency: "SAR" })));
  });

  it("caches teacher curriculum sources when the create form is reopened", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    renderPage();
    const toggle = screen.getByText("New payroll");
    fireEvent.click(toggle);
    await waitFor(() => expect(catalogApi.curriculums).toHaveBeenCalledTimes(1));
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(catalogApi.curriculums).toHaveBeenCalledTimes(1);
  });

  it("renders each preview grade under its real curriculum with its actual billing type", () => {
    render(<DraftEditor preview={multiGradePreview} pending={false} submitLabel="Create draft" onSubmit={vi.fn()} />);
    expect(screen.getByText("Egyptian curriculum")).toBeInTheDocument();
    expect(screen.getByText("Saudi curriculum")).toBeInTheDocument();
    expect(screen.getByText("Billing type: Per session")).toBeInTheDocument();
    expect(screen.getByText("Billing type: Hourly")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(4);
  });

  it("shows the supported empty state when the preview has no work items", () => {
    render(<DraftEditor preview={{ ...multiGradePreview, workItems: [], summary: { ...multiGradePreview.summary, gradesCount: 0 } }} pending={false} submitLabel="Create draft" onSubmit={vi.fn()} />);
    expect(screen.getByText("No earnings details are available for this period")).toBeInTheDocument();
  });

  it("does not turn excluded sessions into payroll rows", () => {
    const excludedPreview: PayrollTeacherPreview = {
      ...multiGradePreview,
      workItems: [],
      summary: { ...multiGradePreview.summary, gradesCount: 0, egyptianSessionsCount: 0, gulfMinutes: 0, gulfDisplayDuration: "0h", excludedSessionsCount: 2 },
      warnings: [{ code: "PAYROLL_SESSIONS_EXCLUDED", count: 2 }],
    };
    render(<DraftEditor preview={excludedPreview} pending={false} submitLabel="Create draft" onSubmit={vi.fn()} />);
    expect(screen.getByText("No calculated earnings details are available for this period.")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton", { name: /Rate/ })).not.toBeInTheDocument();
    expect(screen.getByText("Create draft")).toBeDisabled();
  });

  it("requires non-negative rates and submits one entry per real grade ID", () => {
    const onSubmit = vi.fn();
    render(<DraftEditor preview={multiGradePreview} pending={false} submitLabel="Create draft" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "USD" } });
    fireEvent.click(screen.getByText("Create draft"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Check currency, rates, bonuses, and deductions.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Rate - First grade"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Rate - Second grade"), { target: { value: "-1" } });
    fireEvent.click(screen.getByText("Create draft"));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Rate - Second grade"), { target: { value: "60" } });
    fireEvent.click(screen.getByText("Create draft"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      currency: "USD",
      rates: [{ gradeId: "grade-1", rate: 50 }, { gradeId: "grade-2", rate: 60 }],
    }));
  });

  it("does not duplicate the same grade ID across curricula in the rates payload", () => {
    const onSubmit = vi.fn();
    const duplicateGradePreview: PayrollTeacherPreview = {
      ...multiGradePreview,
      workItems: [multiGradePreview.workItems[0], { ...multiGradePreview.workItems[1], gradeId: "grade-1" }],
    };
    render(<DraftEditor preview={duplicateGradePreview} pending={false} submitLabel="Create draft" onSubmit={onSubmit} />);
    expect(screen.getAllByLabelText("Rate - First grade")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "USD" } });
    fireEvent.change(screen.getByLabelText("Rate - First grade"), { target: { value: "55" } });
    fireEvent.click(screen.getByText("Create draft"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rates: [{ gradeId: "grade-1", rate: 55 }] }));
  });
});
