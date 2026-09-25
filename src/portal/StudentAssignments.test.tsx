import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentAssignments from "./StudentAssignments";

const mocks = vi.hoisted(() => ({ list: vi.fn(), submitAssignment: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/api/studentAssignmentsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/studentAssignmentsApi")>()),
  studentAssignmentsApi: { list: mocks.list, submitAssignment: mocks.submitAssignment },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

const assignment = {
  id: "assignment-1",
  teacher: "teacher-id",
  subject: { id: "subject-1", name: "الرياضيات" },
  title: "حل التمارين",
  description: "حل الأسئلة من 1 إلى 5",
  dueDate: "2026-09-30T18:00:00.000Z",
  attachment: "https://example.com/homework.pdf",
  totalPoints: 20,
  createdAt: "2026-09-20T08:00:00.000Z",
  updatedAt: "2026-09-20T08:00:00.000Z",
  submitted: false,
  status: null,
  grade: null,
  feedback: null,
  submittedAt: null,
} as const;

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentAssignments /></LanguageProvider></QueryClientProvider></MemoryRouter>) };
};

describe("StudentAssignments", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.list.mockReset();
    mocks.submitAssignment.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
  });

  it("renders the supported assignment fields and not-submitted state without course metadata", async () => {
    mocks.list.mockResolvedValue([assignment]);
    renderPage();

    expect(await screen.findByText("الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("حل التمارين")).toBeInTheDocument();
    expect(screen.getByText("حل الأسئلة من 1 إلى 5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("لم يتم التسليم")).toBeInTheDocument();
    expect(screen.getByText("موعد التسليم").parentElement).toHaveTextContent("٢٠٢٦");
    expect(screen.getByRole("link", { name: "فتح مرفق الواجب" })).toHaveAttribute("href", assignment.attachment);
    expect(screen.queryByText(/CourseEnrollment|الفصل|الجولة|الدورة/)).not.toBeInTheDocument();
  });

  it("renders submitted and reviewed states without offering resubmission", async () => {
    mocks.list.mockResolvedValue([
      { ...assignment, id: "submitted", submitted: true, status: "submitted", submittedAt: "2026-09-25T12:00:00.000Z" },
      { ...assignment, id: "reviewed", title: "واجب تمت مراجعته", submitted: true, status: "reviewed", grade: 18, submittedAt: "2026-09-26T12:00:00.000Z" },
    ]);
    renderPage();

    expect(await screen.findByText("تم التسليم")).toBeInTheDocument();
    expect(screen.getByText("تمت المراجعة")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "تسليم الواجب" })).not.toBeInTheDocument();
  });

  it("shows loading, empty, and error states with retry", async () => {
    mocks.list.mockReturnValueOnce(new Promise(() => undefined));
    const loading = renderPage();
    expect(screen.getByLabelText("جاري تحميل الواجبات")).toBeInTheDocument();
    loading.unmount();

    mocks.list.mockResolvedValueOnce([]);
    const empty = renderPage();
    expect(await screen.findByText("لا توجد واجبات متاحة حاليًا")).toBeInTheDocument();
    empty.unmount();

    mocks.list.mockRejectedValueOnce(new Error("failed")).mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce([assignment]);
    renderPage();
    expect(await screen.findByText("تعذر تحميل الواجبات", {}, { timeout: 3_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("حل التمارين")).toBeInTheDocument();
  });

  it("submits the selected attachment once and refreshes the assignment list", async () => {
    let resolveSubmission!: () => void;
    mocks.list.mockResolvedValue([assignment]);
    mocks.submitAssignment.mockReturnValue(new Promise<void>((resolve) => { resolveSubmission = resolve; }));
    renderPage();
    await screen.findByText("حل التمارين");
    const file = new File(["answer"], "answer.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("ملف الإجابة"), { target: { files: [file] } });
    const submit = await screen.findByRole("button", { name: "تسليم الواجب" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(mocks.submitAssignment).toHaveBeenCalledTimes(1));
    expect(mocks.submitAssignment).toHaveBeenCalledWith("assignment-1", file);
    expect(screen.getByRole("button", { name: "جاري التسليم..." })).toBeDisabled();

    resolveSubmission();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("تم تسليم الواجب بنجاح"));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  });
});
