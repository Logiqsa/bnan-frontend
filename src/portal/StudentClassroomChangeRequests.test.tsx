import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentClassroomChangeRequests from "./StudentClassroomChangeRequests";

const mocks = vi.hoisted(() => ({ context: vi.fn(), history: vi.fn(), create: vi.fn() }));
vi.mock("@/api/studentClassroomChangeRequestsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/studentClassroomChangeRequestsApi")>()),
  studentClassroomChangeRequestsApi: { getContext: mocks.context, listChangeRequests: mocks.history, createChangeRequest: mocks.create },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const eligible = [
  { classroomId: "classroom-1", classroomName: "فصل الرياضيات", classroomSubjectId: "classroom-subject-1", subject: { id: "subject-1", name: "الرياضيات" }, teacher: { id: "teacher-1", name: "المعلم الحالي" } },
  { classroomId: "classroom-2", classroomName: "فصل العلوم", classroomSubjectId: "classroom-subject-2", subject: { id: "subject-2", name: "العلوم" }, teacher: null },
];
const request = (id: string, status: string, requestType = "change_teacher") => ({
  id, classroom: "classroom-1", classroomSubject: "classroom-subject-1", subject: { id: "subject-1", name: "الرياضيات" }, student: "student-1", requester: "user-1", requesterRole: "student", requestType, notes: "أرغب في تقديم هذا الطلب", currentTeacher: { id: "teacher-1", user: { id: "user-2", fullName: "المعلم الحالي" } }, replacementTeacher: null, status, adminNotes: status === "approved" ? "تمت المراجعة" : null, rejectionReason: status === "rejected" ? "سبب مسجل" : null, createdAt: "2026-09-20T10:00:00.000Z", reviewedAt: status === "pending" ? null : "2026-09-21T10:00:00.000Z",
});

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentClassroomChangeRequests /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentClassroomChangeRequests", () => {
  beforeEach(() => { localStorage.setItem("bnan_language", "ar"); mocks.context.mockReset(); mocks.history.mockReset(); mocks.create.mockReset(); mocks.history.mockResolvedValue([]); });

  it("uses the backend context and renders only returned eligible subjects", async () => {
    mocks.context.mockResolvedValue([eligible[0]]);
    renderPage();
    expect(await screen.findByText("فصل الرياضيات")).toBeInTheDocument();
    expect(screen.queryByText("فصل العلوم")).not.toBeInTheDocument();
    expect(screen.getByText(/المعلم الحالي:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "طلب تغيير المعلم" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "طلب إلغاء المادة" })).toBeInTheDocument();
  });

  it("submits change_teacher with the context classroom and subject identifiers", async () => {
    mocks.context.mockResolvedValue([eligible[0]]);
    mocks.create.mockResolvedValue(request("created", "pending"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "طلب تغيير المعلم" }));
    fireEvent.change(screen.getByLabelText("سبب الطلب"), { target: { value: "أحتاج تغيير المعلم" } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال الطلب" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ classroomId: "classroom-1", classroomSubjectId: "classroom-subject-1", requestType: "change_teacher", notes: "أحتاج تغيير المعلم" }));
    expect(await screen.findByRole("status")).toHaveTextContent("قيد المراجعة");
  });

  it("submits cancel_subject without changing the subject locally", async () => {
    mocks.context.mockResolvedValue([eligible[0]]);
    mocks.create.mockResolvedValue(request("created", "pending", "cancel_subject"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "طلب إلغاء المادة" }));
    fireEvent.change(screen.getByLabelText("سبب الطلب"), { target: { value: "لا أريد متابعة المادة" } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال الطلب" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ classroomId: "classroom-1", classroomSubjectId: "classroom-subject-1", requestType: "cancel_subject", notes: "لا أريد متابعة المادة" }));
    expect(screen.getByText("فصل الرياضيات")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("قيد المراجعة");
  });

  it("prevents duplicate submission while the request is pending", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mocks.context.mockResolvedValue([eligible[0]]);
    mocks.create.mockReturnValue(new Promise((res) => { resolve = res; }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "طلب تغيير المعلم" }));
    fireEvent.change(screen.getByLabelText("سبب الطلب"), { target: { value: "أحتاج تغيير المعلم" } });
    const submit = screen.getByRole("button", { name: "إرسال الطلب" });
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    resolve(request("created", "pending"));
  });

  it("keeps the existing request history and status rendering", async () => {
    mocks.context.mockResolvedValue(eligible);
    mocks.history.mockImplementation((classroomId: string) => classroomId === "classroom-1" ? Promise.resolve([request("r1", "pending"), request("r2", "approved", "cancel_subject"), request("r3", "rejected"), request("r4", "cancelled")]) : Promise.resolve([]));
    renderPage();
    for (const label of ["قيد المراجعة", "تمت الموافقة", "مرفوض", "ملغي"]) expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText("تمت المراجعة")).toBeInTheDocument();
    expect(screen.getByText("سبب مسجل")).toBeInTheDocument();
    expect(screen.getAllByText("الرياضيات").length).toBeGreaterThan(0);
  });
});
