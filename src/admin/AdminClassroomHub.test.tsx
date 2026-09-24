import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminClassroomHub from "./AdminClassroomHub";
import { LanguageProvider } from "@/i18n/LanguageContext";

const mocks = vi.hoisted(() => ({
  getClassroom: vi.fn(), listSubjects: vi.fn(), listStudents: vi.fn(),
  listSessions: vi.fn(), listRecordings: vi.fn(), getSession: vi.fn(), getSessionReport: vi.fn(),
  listEvaluations: vi.fn(), getEvaluation: vi.fn(),
  listAssignments: vi.fn(), getAssignment: vi.fn(), listSubmissions: vi.fn(), getSubmission: vi.fn(),
  listAttendance: vi.fn(),
}));

vi.mock("@/api/classroomZoomApi", () => ({ classroomZoomApi: { getClassroom: mocks.getClassroom } }));
vi.mock("@/api/classroomRecordingsApi", () => ({ classroomRecordingsApi: {
  listSubjects: mocks.listSubjects, listStudents: mocks.listStudents,
  listSessions: mocks.listSessions, listRecordings: mocks.listRecordings,
  getSession: mocks.getSession, getSessionReport: mocks.getSessionReport,
} }));
vi.mock("@/api/adminEvaluationsApi", () => ({ adminEvaluationsApi: { listEvaluations: mocks.listEvaluations, getEvaluation: mocks.getEvaluation } }));
vi.mock("@/api/adminAssignmentsApi", () => ({ adminAssignmentsApi: { listAssignments: mocks.listAssignments, getAssignment: mocks.getAssignment, listSubmissions: mocks.listSubmissions, getSubmission: mocks.getSubmission } }));
vi.mock("@/api/adminClassroomAttendanceApi", () => ({ adminClassroomAttendanceApi: { listClassroomAttendance: mocks.listAttendance } }));
vi.mock("@/admin/AdminClassroomChat", () => ({
  default: ({ classroomId, active }: { classroomId: string; active: boolean }) => active ? <div>classroom-chat-{classroomId}</div> : null,
}));
vi.mock("@/admin/zoom/ClassroomScheduleManagement", () => ({
  default: ({ classroomId, embedded }: { classroomId: string; embedded: boolean }) => <div>classroom-schedule-{classroomId}-{String(embedded)}</div>,
}));
vi.mock("@/admin/zoom/ClassroomZoomManagement", () => ({
  default: ({ classroomId, embedded }: { classroomId: string; embedded: boolean }) => <div>classroom-zoom-{classroomId}-{String(embedded)}</div>,
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const locationText = () => <LocationProbe />;
function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>browser-back</button><button onClick={() => navigate(1)}>browser-forward</button></>;
}

const renderPage = (path = "/admin/classrooms/c1") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/admin/classrooms/:classroomId" element={<><AdminClassroomHub />{locationText()}</>} /></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
};

describe("AdminClassroomHub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    mocks.getClassroom.mockResolvedValue({ success: true, data: { id: "c1", name: "فصل أول", isActive: true, curriculum: { name: "المنهج المصري" }, grade: { name: "الصف الأول" } } });
    mocks.listSubjects.mockResolvedValue({ success: true, data: { subjects: [{ classroomSubjectId: "cs1", id: "s1", name: "رياضيات", teacher: { name: "المعلم" } }] } });
    mocks.listStudents.mockResolvedValue({ success: true, results: 1, data: [{ studentId: "st1", fullName: "طالب أول" }] });
    mocks.listSessions.mockResolvedValue({ success: true, data: [] });
    mocks.listRecordings.mockResolvedValue({ success: true, data: [] });
    mocks.getSession.mockResolvedValue({ success: true, data: { id: "s1", title: "الحصة الأولى", status: "completed", startAt: "2026-09-24T10:00:00.000Z" } });
    mocks.getSessionReport.mockResolvedValue({ success: true, pagination: { currentPage: 1, perPage: 50, total: 2, lastPage: 1 }, data: { sessionId: "s1", status: "ready", participants: [] } });
    mocks.listEvaluations.mockResolvedValue({ success: true, results: 0, data: [], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
    mocks.getEvaluation.mockResolvedValue({ success: true, data: { id: "e1" } });
    mocks.listAssignments.mockResolvedValue({ success: true, results: 0, data: [], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
    mocks.getAssignment.mockResolvedValue({ success: true, data: { id: "a1", title: "واجب الرياضيات", status: "active" } });
    mocks.listSubmissions.mockResolvedValue({ success: true, results: 0, assignment: { id: "a1" }, data: [], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
    mocks.getSubmission.mockResolvedValue({ success: true, data: { id: "sub1" } });
    mocks.listAttendance.mockResolvedValue({ success: true, results: 0, data: [], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
  });

  it("loads the classroom details, subjects, and students and renders actual header data", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "إدارة الفصل" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "الرئيسية" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "الفصول" })).toHaveAttribute("href", "/admin/classrooms");
    expect(screen.getByRole("link", { name: "فصل أول" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "العودة إلى الفصول" })).not.toBeInTheDocument();
    expect(screen.getByText("رياضيات")).toBeInTheDocument();
    expect(screen.getByText("طالب أول")).toBeInTheDocument();
    expect(mocks.getClassroom).toHaveBeenCalledWith("c1");
    expect(mocks.listSubjects).toHaveBeenCalledWith("c1");
    expect(mocks.listStudents).toHaveBeenCalledWith("c1");
    expect(screen.getByRole("tab", { name: "نظرة عامة" })).toHaveAttribute("data-state", "active");
  });

  it("renders every authoritative subject-teacher relationship without using a classroom-level teacher", async () => {
    mocks.getClassroom.mockResolvedValue({ success: true, data: { id: "c1", name: "فصل أول", isActive: true, teacher: { name: "معلم غير معتمد" }, curriculum: { name: "المنهج المصري" }, grade: { name: "الصف الأول" } } });
    mocks.listSubjects.mockResolvedValue({ success: true, data: { subjects: [
      { classroomSubjectId: "cs1", id: "s1", name: "العربية", teacher: { id: "t1", name: "أحمد محمد" } },
      { classroomSubjectId: "cs2", id: "s2", name: "الرياضيات", teacher: { id: "t2", name: "محمد علي" } },
      { classroomSubjectId: "cs3", id: "s3", name: "العلوم", teacher: { id: "t1", name: "أحمد محمد" } },
      { classroomSubjectId: "cs4", id: "s4", name: "الدراسات" },
    ] } });
    renderPage();
    expect(await screen.findByText("المواد والمعلمون")).toBeInTheDocument();
    expect(screen.getByText("العربية")).toBeInTheDocument();
    expect(screen.getByText("الرياضيات")).toBeInTheDocument();
    expect(screen.getByText("العلوم")).toBeInTheDocument();
    expect(screen.getAllByText("أحمد محمد")).toHaveLength(2);
    expect(screen.getByText("محمد علي")).toBeInTheDocument();
    expect(screen.queryByText("معلم غير معتمد")).not.toBeInTheDocument();
    expect(screen.getByText("الدراسات").parentElement).toHaveTextContent("—");
  });

  it("loads classroom-scoped attendance lazily without calling unrelated tab APIs", async () => {
    renderPage("/admin/classrooms/c1?tab=attendance");
    expect(await screen.findByText("لا توجد سجلات حضور لهذا الفصل.")).toBeInTheDocument();
    expect(mocks.listAttendance).toHaveBeenCalledWith("c1", { page: 1, limit: 20 });
    expect(mocks.listSessions).not.toHaveBeenCalled();
    expect(mocks.listRecordings).not.toHaveBeenCalled();
    expect(screen.getByTestId("location")).toHaveTextContent("tab=attendance");
  });

  it("honors a URL tab and loads sessions only when selected", async () => {
    renderPage("/admin/classrooms/c1?tab=sessions");
    await waitFor(() => expect(mocks.listSessions).toHaveBeenCalledWith("c1"));
    expect(screen.getByTestId("location")).toHaveTextContent("tab=sessions");
    expect(screen.getByRole("tab", { name: "الحصص" })).toHaveAttribute("data-state", "active");
  });

  it("renders actual sessions and loads session details and report on demand", async () => {
    mocks.listSessions.mockResolvedValue({ success: true, results: 1, data: [{ id: "s1", title: "الحصة الأولى", status: "completed", startAt: "2026-09-24T10:00:00.000Z", teacher: { name: "المعلم" } }] });
    renderPage("/admin/classrooms/c1?tab=sessions");
    expect(await screen.findByText("الحصة الأولى")).toBeInTheDocument();
    expect(screen.getByText("مكتملة")).toBeInTheDocument();
    expect(mocks.getSession).not.toHaveBeenCalled();
    await act(async () => { screen.getByRole("button", { name: /التفاصيل/ }).click(); });
    expect(await screen.findByText("تفاصيل الحصة")).toBeInTheDocument();
    await waitFor(() => expect(mocks.getSession).toHaveBeenCalledWith("s1"));
    await waitFor(() => expect(mocks.getSessionReport).toHaveBeenCalledWith("s1"));
    expect(screen.getByText("عدد المشاركين: 2")).toBeInTheDocument();
  });

  it("renders recordings only from the classroom endpoint and reuses the recording player", async () => {
    mocks.listRecordings.mockResolvedValue({ success: true, results: 1, data: [{ sessionName: "تسجيل الرياضيات", recordingLink: "https://media.example/lesson.mp4", localUrl: "https://media.example/lesson.mp4" }] });
    renderPage("/admin/classrooms/c1?tab=recordings");
    expect(await screen.findByText("تسجيل الرياضيات")).toBeInTheDocument();
    expect(mocks.listRecordings).toHaveBeenCalledWith("c1");
    expect(screen.queryByRole("link", { name: /إدارة ورفع التسجيلات/ })).not.toBeInTheDocument();
    await act(async () => { screen.getByRole("button", { name: /تشغيل التسجيل/ }).click(); });
    expect(await screen.findByRole("dialog", { name: /تشغيل تسجيل الرياضيات/ })).toBeInTheDocument();
  });

  it("loads classroom-scoped evaluations lazily and sends filters when selected", async () => {
    mocks.listEvaluations.mockResolvedValue({ success: true, results: 1, data: [{ id: "e1", student: { id: "st1", user: { fullName: "طالب أول" } }, subject: { id: "sub1", name: "رياضيات" }, weekStart: "2026-09-21T00:00:00.000Z", attendance: "present", participation: "good", homework: "very_good", behavior: "excellent", bonus: 2, notes: "ممتاز" }], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 1 } });
    renderPage("/admin/classrooms/c1?tab=evaluations");
    await waitFor(() => expect(mocks.listEvaluations).toHaveBeenCalledWith(expect.objectContaining({ classroom: "c1", page: 1, limit: 20 })));
    expect(await screen.findByText("طالب أول")).toBeInTheDocument();
    expect(screen.queryByText("نسبة")).not.toBeInTheDocument();
    screen.getByRole("button", { name: /التفاصيل/ }).click();
    expect(await screen.findByText("تفاصيل التقييم")).toBeInTheDocument();
  });

  it("loads classroom-scoped assignments lazily and opens read-only assignment details", async () => {
    mocks.listAssignments.mockResolvedValue({ success: true, results: 1, data: [{ id: "a1", title: "واجب الرياضيات", subject: { id: "sub1", name: "رياضيات" }, status: "active", dueDate: "2026-09-30T00:00:00.000Z" }], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 1 } });
    renderPage("/admin/classrooms/c1?tab=assignments");
    await waitFor(() => expect(mocks.listAssignments).toHaveBeenCalledWith(expect.objectContaining({ classroom: "c1", page: 1, limit: 20 })));
    expect(await screen.findByText("واجب الرياضيات")).toBeInTheDocument();
    expect(mocks.listAssignments).toHaveBeenCalledTimes(1);
    screen.getByRole("button", { name: /التفاصيل/ }).click();
    expect(await screen.findByText("تفاصيل الواجب")).toBeInTheDocument();
    await waitFor(() => expect(mocks.getAssignment).toHaveBeenCalledWith("a1"));
    await waitFor(() => expect(mocks.listSubmissions).toHaveBeenCalledWith("a1", { page: 1, limit: 20 }));
  });

  it("loads attendance only for the attendance tab and keeps the classroom scope", async () => {
    mocks.listAttendance.mockResolvedValue({ success: true, results: 1, data: [{ id: "att1", student: { id: "st1", name: "طالب أول" }, session: { id: "s1", name: "الحصة الأولى" }, status: "late", joinedAt: "2026-09-24T10:00:00.000Z", duration: 12 }], pagination: { current_page: 1, last_page: 1, per_page: 20, total: 1 } });
    renderPage("/admin/classrooms/c1?tab=attendance");
    await waitFor(() => expect(mocks.listAttendance).toHaveBeenCalledWith("c1", expect.objectContaining({ page: 1, limit: 20 })));
    expect(await screen.findByText("طالب أول")).toBeInTheDocument();
    expect(screen.getByText("متأخر")).toBeInTheDocument();
  });

  it("renders the contextual Chat tab at tab=chat", async () => {
    renderPage("/admin/classrooms/c1?tab=chat");
    expect(await screen.findByText("classroom-chat-c1")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "المحادثات" })).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("location")).toHaveTextContent("tab=chat");
  });

  it("keeps Hub back navigation and contextual overview shortcuts", async () => {
    renderPage();
    expect(await screen.findByRole("link", { name: "الفصول" })).toHaveAttribute("href", "/admin/classrooms");

    await act(async () => { screen.getByRole("button", { name: "الواجبات" }).click(); });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("tab=assignments"));
  });

  it("preserves remaining tab query values and legacy messages compatibility", async () => {
    const zoomView = renderPage("/admin/classrooms/c1?tab=zoom");
    expect(await screen.findByRole("tab", { name: "Zoom" })).toHaveAttribute("data-state", "active");
    zoomView.unmount();

    renderPage("/admin/classrooms/c1?tab=messages");
    expect(await screen.findByText("classroom-chat-c1")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "المحادثات" })).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("location")).toHaveTextContent("tab=messages");
  });

  it("renders Schedule and Zoom inside the Hub route", async () => {
    const scheduleView = renderPage("/admin/classrooms/c1?tab=schedule");
    expect(await screen.findByText("classroom-schedule-c1-true")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/classrooms/c1?tab=schedule");
    expect(screen.queryByRole("link", { name: /فتح الجدول/ })).not.toBeInTheDocument();
    scheduleView.unmount();

    renderPage("/admin/classrooms/c1?tab=zoom");
    expect(await screen.findByText("classroom-zoom-c1-true")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/classrooms/c1?tab=zoom");
    expect(screen.queryByRole("link", { name: /فتح إدارة Zoom/ })).not.toBeInTheDocument();
  });

  it("pushes tab history so browser Back and Forward restore Hub tabs", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "إدارة الفصل" });
    await act(async () => { screen.getByRole("button", { name: "الحصص" }).click(); });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("tab=sessions"));

    await act(async () => { screen.getByRole("button", { name: "browser-back" }).click(); });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/admin/classrooms/c1"));
    expect(screen.getByTestId("location")).not.toHaveTextContent("tab=");
    await act(async () => { screen.getByRole("button", { name: "browser-forward" }).click(); });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("tab=sessions"));
  });

  it("falls back to Overview for an invalid tab without leaving the Hub", async () => {
    renderPage("/admin/classrooms/c1?tab=unknown");
    expect(await screen.findByRole("tab", { name: "نظرة عامة" })).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/classrooms/c1?tab=unknown");
  });
});
