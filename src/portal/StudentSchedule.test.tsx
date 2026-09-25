import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentSchedule from "./StudentSchedule";

const mocks = vi.hoisted(() => ({ home: vi.fn(), schedule: vi.fn(), join: vi.fn(), report: vi.fn() }));
vi.mock("@/api/studentHomeApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/studentHomeApi")>();
  return { ...actual, studentHomeApi: { get: mocks.home } };
});
vi.mock("@/api/scheduleApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/scheduleApi")>();
  return { ...actual, getScheduleWeek: mocks.schedule, joinLesson: mocks.join };
});
vi.mock("@/api/studentSessionReportApi", () => ({
  studentSessionReportApi: { getReport: mocks.report },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const home = (registrationMode: "egyptian" | "gulf") => ({
  student: { id: "student-1", userId: "user-1", curriculum: { id: "curriculum-1", name: "Curriculum", registrationMode } },
  subscription: null, subscriptions: [], stats: {}, generatedAt: "2026-09-23T00:00:00.000Z",
});
const lesson = (canJoin: boolean) => ({
  key: "lesson-1", registrationMode: "gulf" as const, classroom: { id: "classroom-1", name: "فصل العلوم" },
  classroomSubjectId: "assignment-1", subject: { id: "subject-1", name: "العلوم" }, day: "saturday",
  date: "2026-09-19", startTime: "10:00", endTime: "11:00", scheduledAt: null,
  activeSession: { id: "session-1", sessionId: "session-1", status: "live" as const, canJoin },
});
const week = (lessons = [lesson(true)]) => ({ currentWeek: 3, currentWeekStart: "2026-09-19", weekStart: "2026-09-19", weekEnd: "2026-09-25", timezone: "Africa/Cairo", lessons });
const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}><LanguageProvider><StudentSchedule /></LanguageProvider></QueryClientProvider></MemoryRouter>);
};

describe("StudentSchedule", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-23T10:00:00Z"));
    mocks.home.mockReset(); mocks.schedule.mockReset(); mocks.join.mockReset(); mocks.report.mockReset();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it.each(["egyptian", "gulf"] as const)("uses the backend registrationMode %s", async (mode) => {
    mocks.home.mockResolvedValue(home(mode)); mocks.schedule.mockResolvedValue(week([]));
    renderPage();
    await waitFor(() => expect(mocks.schedule).toHaveBeenCalledWith(mode, "2026-09-19"));
    expect((await screen.findAllByText("لا توجد حصص"))).toHaveLength(7);
  });

  it("renders backend week metadata and sends the next weekStart", async () => {
    mocks.home.mockResolvedValue(home("gulf")); mocks.schedule.mockResolvedValue(week([]));
    renderPage();
    expect(await screen.findByText("Africa/Cairo")).toBeInTheDocument();
    expect(screen.getByText(/١٩ سبتمبر ٢٠٢٦/)).toBeInTheDocument();
    expect(screen.getByText(/٢٥ سبتمبر ٢٠٢٦/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /الأسبوع التالي/ }));
    await waitFor(() => expect(mocks.schedule).toHaveBeenLastCalledWith("gulf", "2026-09-26"));
  });

  it("shows join only when the backend marks the session joinable and uses its meetingLink", async () => {
    mocks.home.mockResolvedValue(home("gulf")); mocks.schedule.mockResolvedValue(week([lesson(true), { ...lesson(false), key: "lesson-2", classroom: { id: "classroom-2", name: "فصل آخر" } }]));
    mocks.join.mockResolvedValue({ success: true, data: { meetingLink: "https://zoom.example/join", status: "live" } });
    renderPage();
    const buttons = await screen.findAllByRole("button", { name: /دخول الحصة/ });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(mocks.join).toHaveBeenCalledWith("classroom-1"));
    expect(window.open).toHaveBeenCalledWith("https://zoom.example/join", "_blank", "noopener,noreferrer");
    expect(window.open).not.toHaveBeenCalledWith(expect.stringContaining("classroom-1"), expect.anything(), expect.anything());
  });

  it.each([
    [{ code: "SESSION_NOT_ACTIVE", status: 404, message: "raw" }, "الحصة ليست متاحة للدخول الآن."],
    [{ code: "CLASSROOM_ZOOM_NOT_CONFIGURED", status: 409, message: "raw" }, "رابط الحصة غير مُجهز حاليًا."],
  ])("shows a safe join error", async (error, message) => {
    mocks.home.mockResolvedValue(home("gulf")); mocks.schedule.mockResolvedValue(week()); mocks.join.mockRejectedValue(error);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /دخول الحصة/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(window.open).not.toHaveBeenCalled();
  });

  it("opens session details with verified lesson data and no eager report request", async () => {
    mocks.home.mockResolvedValue(home("gulf")); mocks.schedule.mockResolvedValue(week());
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "فتح تفاصيل العلوم" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("العلوم")).toHaveLength(2);
    expect(screen.getAllByText("فصل العلوم")).toHaveLength(2);
    expect(screen.getByText("معلومات الحصة")).toBeInTheDocument();
    expect(mocks.report).not.toHaveBeenCalled();
  });

  it("uses only activeSession recording and summary URLs", async () => {
    const detailedLesson = {
      ...lesson(false),
      activeSession: {
        ...lesson(false).activeSession,
        recordingUrl: "https://zoom.example/verified-recording",
        summaryUrl: "https://docs.example/verified-summary",
      },
    };
    mocks.home.mockResolvedValue(home("gulf")); mocks.schedule.mockResolvedValue(week([detailedLesson]));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "فتح تفاصيل العلوم" }));
    expect(screen.getByRole("link", { name: /فتح التسجيل/ })).toHaveAttribute("href", "https://zoom.example/verified-recording");
    expect(screen.getByRole("link", { name: /فتح الملخص/ })).toHaveAttribute("href", "https://docs.example/verified-summary");
    expect(document.querySelector("video")).not.toBeInTheDocument();
  });

  it("loads a report only on request using sessionId and renders aggregates without participant identity", async () => {
    mocks.home.mockResolvedValue(home("gulf")); mocks.schedule.mockResolvedValue(week());
    mocks.report.mockResolvedValue({ success: true, data: {
      sessionId: "session-1", status: "ready",
      summary: { status: "ready", durationMinutes: 45, participantRows: 4, uniqueParticipants: 3 },
      participants: [{ name: "Hidden Student", email: "hidden@example.com" }],
    } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "فتح تفاصيل العلوم" }));
    expect(mocks.report).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "عرض التقرير" }));
    await waitFor(() => expect(mocks.report).toHaveBeenCalledWith("session-1"));
    expect(await screen.findByText("45 دقيقة")).toBeInTheDocument();
    expect(screen.getByText("سجلات مشاركي Zoom")).toBeInTheDocument();
    expect(screen.getByText("مشاركو Zoom الفريدون")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Student")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("حاضر")).not.toBeInTheDocument();
  });

  it("falls back to activeSession.id and keeps session information visible when report fails", async () => {
    const egyptianLesson = { ...lesson(false), registrationMode: "egyptian" as const, activeSession: { id: "egyptian-session", status: "ended" as const, canJoin: false } };
    mocks.home.mockResolvedValue(home("egyptian")); mocks.schedule.mockResolvedValue(week([egyptianLesson]));
    mocks.report.mockRejectedValue(new Error("failed"));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "فتح تفاصيل العلوم" }));
    fireEvent.click(screen.getByRole("button", { name: "عرض التقرير" }));
    await waitFor(() => expect(mocks.report).toHaveBeenCalledWith("egyptian-session"));
    expect(await screen.findByText("تعذر تحميل تقرير الحصة.")).toBeInTheDocument();
    expect(screen.getByText("معلومات الحصة")).toBeInTheDocument();
  });

  it("does not expose session actions or fetch a report when activeSession is null", async () => {
    mocks.home.mockResolvedValue(home("gulf")); mocks.schedule.mockResolvedValue(week([{ ...lesson(false), activeSession: null }]));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "فتح تفاصيل العلوم" }));
    expect(screen.queryByRole("button", { name: "دخول الحصة" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "عرض التقرير" })).not.toBeInTheDocument();
    expect(screen.queryByText("تسجيل الحصة")).not.toBeInTheDocument();
    expect(screen.queryByText("ملخص الحصة")).not.toBeInTheDocument();
    expect(mocks.report).not.toHaveBeenCalled();
  });
});
