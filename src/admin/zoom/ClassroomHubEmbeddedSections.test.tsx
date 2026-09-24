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
  getEgyptianSchedule: vi.fn(),
  getGulfSchedule: vi.fn(),
  getAvailability: vi.fn(),
}));

vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { role: "admin" } }) }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div> }));
vi.mock("@/api/classroomRecordingsApi", () => ({ classroomRecordingsApi: {
  listSubjects: mocks.listSubjects,
  listClassrooms: mocks.listClassrooms,
} }));
vi.mock("@/api/classroomZoomApi", () => ({ classroomZoomApi: {
  getClassroom: mocks.getClassroom,
  getEgyptianSchedule: mocks.getEgyptianSchedule,
  getGulfSchedule: mocks.getGulfSchedule,
  getAvailability: mocks.getAvailability,
  saveEgyptianDay: vi.fn(),
  deleteEgyptianDay: vi.fn(),
  saveGulfSchedule: vi.fn(),
  deleteGulfSchedule: vi.fn(),
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
    mocks.getEgyptianSchedule.mockResolvedValue({ success: true, data: { timezone: "Africa/Cairo", days: [] } });
    mocks.getGulfSchedule.mockResolvedValue({ success: true, data: { schedule: [] } });
    mocks.getAvailability.mockResolvedValue({ success: true, data: { timezone: "Africa/Cairo", accounts: [] } });
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

  it("keeps the legacy Schedule route using the page layout", async () => {
    render(<LanguageProvider><MemoryRouter initialEntries={["/admin/classrooms/c1/schedule"]}><Routes><Route path="/admin/classrooms/:classroomId/schedule" element={<ClassroomScheduleManagement />} /></Routes></MemoryRouter></LanguageProvider>);
    expect(await screen.findByRole("heading", { name: "جدول فصل أول" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تعديل الجدول" })).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
  });

  it("renders the existing Zoom management content in embedded mode", async () => {
    render(<LanguageProvider><MemoryRouter><ClassroomZoomManagement classroomId="c1" embedded /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByText("إدارة رابط Zoom")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
    expect(mocks.listClassrooms).toHaveBeenCalled();
    expect(mocks.getClassroom).toHaveBeenCalledWith("c1");
  });

  it("keeps the legacy Zoom route using the page layout", async () => {
    render(<LanguageProvider><MemoryRouter initialEntries={["/admin/classroom-zoom?classroomId=c1"]}><ClassroomZoomManagement /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByText("إدارة رابط Zoom")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
  });
});
