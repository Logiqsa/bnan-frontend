import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AdminPayroll, { DraftEditor } from "./AdminPayroll";
import { adminPayrollApi } from "@/api/adminPayrollApi";
import type { PayrollTeacherPreview } from "@/api/adminPayrollApi";
import { catalogApi } from "@/api/catalogApi";
import { courseStaffApi } from "@/api/courseStaffApi";

vi.mock("@/api/adminPayrollApi", async (original) => ({
  ...(await original<typeof import("@/api/adminPayrollApi")>()),
  adminPayrollApi: { list: vi.fn(), get: vi.fn(), allTeachersPreview: vi.fn(), teacherPreview: vi.fn(), create: vi.fn(), update: vi.fn(), pay: vi.fn() },
}));
vi.mock("@/api/catalogApi", () => ({ catalogApi: { curriculums: vi.fn() } }));
vi.mock("@/api/courseStaffApi", () => ({ courseStaffApi: { teachers: vi.fn() } }));
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

const renderPage = (path = "/admin/payroll") => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/admin/payroll" element={<AdminPayroll />} />
      <Route path="/admin/payroll/:payrollId" element={<AdminPayroll />} />
    </Routes></MemoryRouter>
  </QueryClientProvider>,
);

describe("AdminPayroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogApi.curriculums).mockResolvedValue({ success: true, results: 2, data: [{ id: "curriculum-1", name: "Egyptian", registrationMode: "egyptian" }, { id: "curriculum-2", name: "Saudi", registrationMode: "gulf" }] });
    vi.mocked(courseStaffApi.teachers).mockResolvedValue([{ id: "teacher-internal-id", name: "Named Teacher", curriculumIds: ["curriculum-1"] }]);
  });

  it("renders an empty payroll list", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No payrolls found.")).toBeInTheDocument();
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

  it("passes the selected internal teacher ID to payroll preview", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    vi.mocked(adminPayrollApi.allTeachersPreview).mockResolvedValue({
      period: { from: "2026-09-01", to: "2026-09-30" },
      teachers: [{
        teacherId: "teacher-internal-id", fullName: "Named Teacher", email: null,
        systems: [], gulf: { minutes: 0, displayDuration: "0h" },
        egyptian: { minutes: 0, displayDuration: "0h", sessionsCount: 0 },
        gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 0,
        payrollStatus: "unprepared", payrollId: null,
      }, {
        teacherId: "hidden-empty", fullName: "", email: null,
        systems: [], gulf: { minutes: 0, displayDuration: "0h" },
        egyptian: { minutes: 0, displayDuration: "0h", sessionsCount: 0 },
        gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 0,
        payrollStatus: "unprepared", payrollId: null,
      }, {
        teacherId: "hidden-whitespace", fullName: "   ", email: null,
        systems: [], gulf: { minutes: 0, displayDuration: "0h" },
        egyptian: { minutes: 0, displayDuration: "0h", sessionsCount: 0 },
        gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 0,
        payrollStatus: "unprepared", payrollId: null,
      }],
    });
    vi.mocked(adminPayrollApi.teacherPreview).mockResolvedValue({
      teacher: { id: "teacher-internal-id", fullName: "Named Teacher", email: null, phone: null },
      period: { from: "2026-09-01", to: "2026-09-30" },
      summary: { gulfMinutes: 0, gulfDisplayDuration: "0h", egyptianMinutes: 0, egyptianDisplayDuration: "0h", egyptianSessionsCount: 0, gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 1 },
      workItems: [], payoutProfile: null, warnings: [],
    });
    renderPage();
    fireEvent.click(screen.getByText("New payroll"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-30" } });
    await screen.findByLabelText("Teacher");
    fireEvent.click(screen.getByLabelText("Teacher"));
    expect(screen.queryByText("Unnamed teacher")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-empty")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden-whitespace")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByText("Named Teacher"));
    await waitFor(() => expect(adminPayrollApi.teacherPreview).toHaveBeenCalledWith("teacher-internal-id", "2026-09-01", "2026-09-30"));
    expect(await screen.findByText(/Sessions excluded from calculation/)).toHaveTextContent("1");
    expect(screen.queryByText(/payable/i)).not.toBeInTheDocument();
    expect(screen.getByText("No calculated earnings details are available for this period.")).toBeInTheDocument();
    expect(screen.getByText("Some sessions were excluded from the calculation.")).toBeInTheDocument();
  });

  it("renders curriculum outside the dropdown and clears an incompatible selected teacher", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    vi.mocked(adminPayrollApi.allTeachersPreview).mockResolvedValue({
      period: { from: "2026-09-01", to: "2026-09-30" },
      teachers: [
        { teacherId: "teacher-internal-id", fullName: "Named Teacher", email: null, systems: [], gulf: { minutes: 0, displayDuration: "0h" }, egyptian: { minutes: 0, displayDuration: "0h", sessionsCount: 0 }, gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 0, payrollStatus: "unprepared", payrollId: null },
        { teacherId: "teacher-2", fullName: "Saudi Teacher", email: null, systems: [], gulf: { minutes: 0, displayDuration: "0h" }, egyptian: { minutes: 0, displayDuration: "0h", sessionsCount: 0 }, gradesCount: 0, curriculumsCount: 0, excludedSessionsCount: 0, payrollStatus: "unprepared", payrollId: null },
      ],
    });
    vi.mocked(courseStaffApi.teachers).mockResolvedValue([
      { id: "teacher-internal-id", name: "Named Teacher", curriculumIds: ["curriculum-1"] },
      { id: "teacher-2", name: "Saudi Teacher", curriculumIds: ["curriculum-2"] },
    ]);
    renderPage();
    fireEvent.click(screen.getByText("New payroll"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-30" } });
    const teacherSelector = await screen.findByLabelText("Teacher");
    const curriculumSelector = await screen.findByLabelText("Curriculum");
    fireEvent.click(teacherSelector);
    fireEvent.click(screen.getByText("Named Teacher"));
    expect(teacherSelector).toHaveTextContent("Named Teacher");
    fireEvent.change(curriculumSelector, { target: { value: "curriculum-2" } });
    expect(teacherSelector).toHaveTextContent("Select teacher");
    fireEvent.click(teacherSelector);
    expect(screen.getByText("Saudi Teacher")).toBeInTheDocument();
    expect(screen.queryByText("Named Teacher")).not.toBeInTheDocument();
    fireEvent.change(curriculumSelector, { target: { value: "all" } });
    expect(screen.getByText("Named Teacher")).toBeInTheDocument();
  });

  it("caches teacher curriculum sources when the create form is reopened", async () => {
    vi.mocked(adminPayrollApi.list).mockResolvedValue([]);
    renderPage();
    const toggle = screen.getByText("New payroll");
    fireEvent.click(toggle);
    await waitFor(() => expect(courseStaffApi.teachers).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(catalogApi.curriculums).toHaveBeenCalledTimes(1));
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(courseStaffApi.teachers).toHaveBeenCalledTimes(1);
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
