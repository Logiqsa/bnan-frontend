import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ClassroomScheduleManagement from "./ClassroomScheduleManagement";
import ClassroomZoomManagement from "./ClassroomZoomManagement";

const mocks = vi.hoisted(() => ({
  getClassroom: vi.fn(),
  listSubjects: vi.fn(),
  listClassrooms: vi.fn(),
  getSchedule: vi.fn(),
  getAvailability: vi.fn(),
  getWeeklyAssignments: vi.fn(),
}));
vi.mock("@/api/zoomAccountsApi", () => ({ zoomAccountsApi: {
  getClassroomWeeklyAssignments: mocks.getWeeklyAssignments,
  retryClassroomWeeklyAssignments: vi.fn(),
} }));

vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { role: "admin" } }) }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div> }));
vi.mock("@/api/classroomRecordingsApi", () => ({ classroomRecordingsApi: {
  listSubjects: mocks.listSubjects,
  listClassrooms: mocks.listClassrooms,
} }));
vi.mock("@/api/classroomZoomApi", () => ({ classroomZoomApi: {
  getClassroom: mocks.getClassroom,
  getSchedule: mocks.getSchedule,
  getAvailability: mocks.getAvailability,
  saveScheduleEntries: vi.fn(),
  generateMeeting: vi.fn(),
} }));

const classroom = {
  id: "c1",
  name: "فصل أول",
  zoomAssignmentMode: "manual" as const,
  curriculum: { id: "cur1", name: "المنهج المصري", registrationMode: "egyptian" as const },
  grade: { id: "g1", name: "الصف الأول" },
};

describe("Classroom Hub embedded Schedule and Zoom sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClassroom.mockResolvedValue({ success: true, data: classroom });
    mocks.listSubjects.mockResolvedValue({ success: true, data: { subjects: [{ classroomSubjectId: "cs1", name: "رياضيات", isActive: true }] } });
    mocks.listClassrooms.mockResolvedValue({ success: true, data: [classroom] });
    mocks.getSchedule.mockResolvedValue({ success: true, data: { timezone: "Africa/Cairo", entries: [] } });
    mocks.getAvailability.mockResolvedValue({ success: true, data: { timezone: "Africa/Cairo", accounts: [] } });
    mocks.getWeeklyAssignments.mockResolvedValue({ success: true, data: { classroom: { id: "c1", name: "فصل أول" }, slots: [] } });
  });

  it("renders embedded Schedule read-only until Edit Schedule is selected", async () => {
    render(<LanguageProvider><MemoryRouter><ClassroomScheduleManagement classroomId="c1" embedded /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByRole("heading", { name: "جدول فصل أول" })).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
    expect(mocks.getClassroom).toHaveBeenCalledWith("c1");
    expect(screen.queryByRole("button", { name: "إضافة حصة" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حفظ الجدول" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "تعديل الجدول" }));
    expect(screen.getByRole("heading", { name: "تعديل جدول فصل أول" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إضافة حصة" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "حفظ الجدول" })).toHaveLength(2);
  });

  it("allows more than one Saudi lesson on the same day", async () => {
    mocks.getClassroom.mockResolvedValue({
      success: true,
      data: { ...classroom, curriculum: { ...classroom.curriculum, registrationMode: "gulf" } },
    });
    mocks.getSchedule.mockResolvedValue({
      success: true,
      data: { timezone: "Africa/Cairo", entries: [{ id: "entry-1", day: "saturday", startTime: "09:00", endTime: "10:00", classroomSubjectId: "cs1" }] },
    });

    render(<LanguageProvider><MemoryRouter><ClassroomScheduleManagement classroomId="c1" embedded /></MemoryRouter></LanguageProvider>);
    await screen.findByRole("heading", { name: "جدول فصل أول" });
    fireEvent.click(screen.getByRole("button", { name: "تعديل الجدول" }));
    fireEvent.click(screen.getByRole("button", { name: "إضافة حصة" }));

    expect(screen.getByRole("heading", { name: "الحصة 2" })).toBeInTheDocument();
  });

  it("shows the Zoom participant link on its matching schedule entry", async () => {
    mocks.getSchedule.mockResolvedValue({
      success: true,
      data: { timezone: "Africa/Cairo", entries: [{ id: "entry-1", day: "saturday", startTime: "09:00", endTime: "10:00", classroomSubjectId: "cs1" }] },
    });
    mocks.getWeeklyAssignments.mockResolvedValue({ success: true, data: {
      classroom: { id: "c1", name: "فصل أول" },
      slots: [{ assignmentId: "assignment-1", weeklySlotKey: "zws_1", slotId: "entry-1", day: "saturday", startTime: "09:00", endTime: "10:00", timezone: "Africa/Cairo", status: "ready", state: "ready", cutoverState: "active", assignmentVersion: 1, meeting: { id: "meeting-1", participantUrl: "https://zoom.example/j/123", type: 3 }, account: { id: "zoom-1", name: "Zoom 1", hostFingerprint: null }, reason: null }],
    } });

    render(<LanguageProvider><MemoryRouter><ClassroomScheduleManagement classroomId="c1" embedded /></MemoryRouter></LanguageProvider>);

    expect(await screen.findByRole("link", { name: "https://zoom.example/j/123" })).toHaveAttribute("href", "https://zoom.example/j/123");
    expect(screen.getByText("جاهز")).toBeInTheDocument();
  });

  it("keeps the Schedule route using the page layout", async () => {
    render(<LanguageProvider><MemoryRouter initialEntries={["/admin/classrooms/c1/schedule"]}><Routes><Route path="/admin/classrooms/:classroomId/schedule" element={<ClassroomScheduleManagement />} /></Routes></MemoryRouter></LanguageProvider>);
    expect(await screen.findByRole("heading", { name: "جدول فصل أول" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تعديل الجدول" })).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
  });

  it("renders the existing Zoom management content in embedded mode", async () => {
    render(<LanguageProvider><MemoryRouter><ClassroomZoomManagement classroomId="c1" embedded /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByText("إدارة رابط Zoom")).toBeInTheDocument();
    expect(await screen.findByText("روابط Zoom الأسبوعية")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
    expect(mocks.listClassrooms).toHaveBeenCalled();
    expect(mocks.getClassroom).toHaveBeenCalledWith("c1");
  });

  it("shows every weekly Zoom link in the Zoom tab", async () => {
    mocks.getSchedule.mockResolvedValue({ success: true, data: { timezone: "Africa/Cairo", entries: [
      { id: "entry-1", day: "saturday", startTime: "09:00", endTime: "10:00", classroomSubjectId: "cs1", subjectName: "رياضيات" },
      { id: "entry-2", day: "saturday", startTime: "11:00", endTime: "12:00", classroomSubjectId: "cs1", subjectName: "رياضيات" },
    ] } });
    mocks.getWeeklyAssignments.mockResolvedValue({ success: true, data: { classroom: { id: "c1", name: "فصل أول" }, slots: [
      { assignmentId: "a1", weeklySlotKey: "z1", slotId: "entry-1", day: "saturday", startTime: "09:00", timezone: "Africa/Cairo", status: "ready", state: "ready", cutoverState: "active", assignmentVersion: 1, meeting: { id: "m1", participantUrl: "https://zoom.example/j/one", type: 3 }, account: { id: "za1", name: "Zoom 1", hostFingerprint: null }, reason: null },
      { assignmentId: "a2", weeklySlotKey: "z2", slotId: "entry-2", day: "saturday", startTime: "11:00", timezone: "Africa/Cairo", status: "ready", state: "ready", cutoverState: "active", assignmentVersion: 1, meeting: { id: "m2", participantUrl: "https://zoom.example/j/two", type: 3 }, account: { id: "za2", name: "Zoom 2", hostFingerprint: null }, reason: null },
    ] } });

    render(<LanguageProvider><MemoryRouter><ClassroomZoomManagement classroomId="c1" embedded /></MemoryRouter></LanguageProvider>);

    expect(await screen.findByRole("link", { name: "https://zoom.example/j/one" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://zoom.example/j/two" })).toBeInTheDocument();
  });

  it("keeps the legacy Zoom route using the page layout", async () => {
    render(<LanguageProvider><MemoryRouter initialEntries={["/admin/classroom-zoom?classroomId=c1"]}><ClassroomZoomManagement /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByText("إدارة رابط Zoom")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
  });
});
