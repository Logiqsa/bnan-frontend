import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CourseEnrollmentDetail from "./CourseEnrollmentDetail";

const mocks = vi.hoisted(() => ({
  enrollment: vi.fn(),
  progress: vi.fn(),
  activeSession: vi.fn(),
  schedule: vi.fn(),
  join: vi.fn(),
  recordings: vi.fn(),
}));

vi.mock("@/api/coursesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/coursesApi")>()),
  coursesApi: {
    myEnrollment: mocks.enrollment,
    myProgress: mocks.progress,
    activeSession: mocks.activeSession,
    getSchedule: mocks.schedule,
    joinActiveSession: mocks.join,
  },
}));
vi.mock("@/api/classroomRecordingsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/classroomRecordingsApi")>()),
  classroomRecordingsApi: { listRecordings: mocks.recordings },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/CourseClassroomChat", () => ({ default: ({ classroomId }: { classroomId: string }) => <div>CHAT:{classroomId}</div> }));
vi.mock("@/components/RecordingPlayerModal", () => ({ default: () => null }));

const activeEnrollment = {
  id: "enrollment-1",
  course: { id: "course-1", name: "دورة الرياضيات", description: "وصف موثق", teacher: "teacher-id", eligibleGrades: [], currency: "EGP", enrollmentModes: {}, enrollmentOpen: true, status: "active" },
  mode: "group" as const,
  classroom: { id: "classroom-1", name: "فصل الدورة", courseMode: "group" as const, isActive: true },
  group: { id: "group-1", name: "المجموعة الأولى", status: "in_progress" as const },
  status: "active" as const,
  price: 500,
  currency: "EGP",
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/portal/student/courses/enrollment-1"]}>
        <Routes><Route path="/portal/student/courses/:enrollmentId" element={<CourseEnrollmentDetail />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("CourseEnrollmentDetail", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.enrollment.mockResolvedValue(activeEnrollment);
    mocks.progress.mockResolvedValue({ requiredMinutes: 120, completedMinutes: 90, completedHours: 1.5, totalHours: 2, percentage: 75, status: "active" });
    mocks.activeSession.mockResolvedValue({ sessionId: "session-1", title: "مراجعة مباشرة", status: "live", canJoin: true, teacher: { fullName: "المعلم أحمد" }, startAt: "2026-09-23T12:00:00.000Z" });
    mocks.schedule.mockResolvedValue({ timezone: "Africa/Cairo", isActive: true, slots: [{ day: "saturday", startTime: "10:00", endTime: "11:00" }] });
    mocks.recordings.mockResolvedValue({ success: true, data: [{ sessionName: "تسجيل المراجعة", recordingLink: "/uploads/record.mp4", localUrl: "/uploads/record.mp4", shareUrl: null }] });
    mocks.join.mockResolvedValue({ sessionId: "session-1", status: "live", canJoin: true, meetingLink: "https://zoom.example/join" });
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("renders enrollment information, backend status, and progress converted from minutes", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "دورة الرياضيات" })).toBeInTheDocument();
    expect(screen.getAllByText("نشط").length).toBeGreaterThan(0);
    expect(screen.getByText("جماعي")).toBeInTheDocument();
    expect(screen.getByText("فصل الدورة")).toBeInTheDocument();
    expect(screen.getByText("500 EGP")).toBeInTheDocument();
    expect(await screen.findByText("75%")).toBeInTheDocument();
    expect(screen.getByText("1.5 ساعة")).toBeInTheDocument();
    expect(screen.getByText("2 ساعة")).toBeInTheDocument();
    expect(screen.queryByText(/متبقية|جلسات مكتملة/)).not.toBeInTheDocument();
  });

  it("renders recurring weekly slots without fabricating dated sessions", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "جدول الدورة الأسبوعي" })).toBeInTheDocument();
    expect(screen.getByText("مواعيد أسبوعية متكررة وليست جلسات بتاريخ محدد.")).toBeInTheDocument();
    expect(screen.getByText("السبت")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 11:00")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-23/)).not.toBeInTheDocument();
  });

  it("shows the active session and joins using only the backend meetingLink", async () => {
    renderPage();
    expect(await screen.findByText("مراجعة مباشرة")).toBeInTheDocument();
    expect(screen.getByText("المعلم: المعلم أحمد")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "دخول الحصة الآن" }));
    await waitFor(() => expect(mocks.join).toHaveBeenCalledWith("classroom-1"));
    expect(window.open).toHaveBeenCalledWith("https://zoom.example/join", "_blank", "noopener,noreferrer");
  });

  it("hides Join when canJoin is false and renders the recordings archive without fabricated metadata", async () => {
    mocks.activeSession.mockResolvedValue({ sessionId: "session-1", status: "starting", canJoin: false });
    renderPage();
    expect(await screen.findByText("تسجيل المراجعة")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "دخول الحصة الآن" })).not.toBeInTheDocument();
    expect(screen.queryByText(/مدة التسجيل|تاريخ التسجيل|session-1/)).not.toBeInTheDocument();
  });

  it("shows chat only for an active enrollment with a classroom", async () => {
    renderPage();
    const chatTab = await screen.findByRole("tab", { name: "محادثة الدورة" });
    fireEvent.mouseDown(chatTab);
    fireEvent.click(chatTab);
    expect(await screen.findByText("CHAT:classroom-1")).toBeInTheDocument();
  });

  it.each(["completed", "cancelled", "refunded", "expired", "removed"] as const)("keeps a %s enrollment viewable without operational actions", async (status) => {
    mocks.enrollment.mockResolvedValue({ ...activeEnrollment, status });
    renderPage();
    expect(await screen.findByRole("heading", { name: "دورة الرياضيات" })).toBeInTheDocument();
    expect(screen.getByText({ completed: "مكتمل", cancelled: "ملغي", refunded: "مسترد", expired: "منتهي", removed: "تمت إزالته" }[status])).toBeInTheDocument();
    expect(screen.queryByText("الجلسة المباشرة للدورة")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "محادثة الدورة" })).toBeDisabled();
    expect(screen.queryByText("CHAT:classroom-1")).not.toBeInTheDocument();
  });

  it("keeps section errors isolated from enrollment information", async () => {
    mocks.progress.mockRejectedValue(new Error("progress failed"));
    mocks.activeSession.mockRejectedValue(new Error("active failed"));
    mocks.schedule.mockRejectedValue(new Error("schedule failed"));
    mocks.recordings.mockRejectedValue(new Error("recordings failed"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "دورة الرياضيات" })).toBeInTheDocument();
    expect(await screen.findByText("progress failed")).toBeInTheDocument();
    expect(screen.getByText("active failed")).toBeInTheDocument();
    expect(screen.getByText("schedule failed")).toBeInTheDocument();
    expect(screen.getByText("recordings failed")).toBeInTheDocument();
  });

  it("renders page loading and an empty recordings state", async () => {
    let resolveEnrollment: (value: typeof activeEnrollment) => void = () => undefined;
    mocks.enrollment.mockReturnValue(new Promise((resolve) => { resolveEnrollment = resolve; }));
    const view = renderPage();
    expect(screen.getByText("جاري التحميل...")).toBeInTheDocument();
    resolveEnrollment(activeEnrollment);
    mocks.recordings.mockResolvedValue({ success: true, data: [] });
    await waitFor(() => expect(screen.getByRole("heading", { name: "دورة الرياضيات" })).toBeInTheDocument());
    expect(await screen.findByText("لا توجد تسجيلات حتى الآن.")).toBeInTheDocument();
    view.unmount();
  });
});
