import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClassroomManagement from "./ClassroomManagement";

const mocks = vi.hoisted(() => ({ listAllClassrooms: vi.fn() }));

vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { role: "admin" } }) }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/api/classroomRecordingsApi", () => ({ classroomRecordingsApi: { listAllClassrooms: mocks.listAllClassrooms } }));
vi.mock("@/api/classroomZoomApi", () => ({ classroomZoomApi: {} }));
vi.mock("@/admin/GradeStageFilter", () => ({
  default: ({ grades, gradeId, onGradeChange, disabled }: { grades: Array<{ id: string; name: string }>; gradeId: string; onGradeChange: (value: string) => void; disabled?: boolean }) => <label>الصف<select aria-label="الصف" value={gradeId} disabled={disabled} onChange={(event) => onGradeChange(event.target.value)}><option value="">اختر الصف</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>,
}));

const classroom = {
  id: "classroom-1",
  name: "أول ابتدائي - عربي",
  isActive: true,
  curriculum: { id: "curriculum-1", name: "المنهج المصري", registrationMode: "egyptian" },
  grade: { id: "grade-1", name: "الصف الأول الابتدائي" },
  zoomAssignmentMode: "manual",
  createdAt: "2026-09-24T00:00:00.000Z",
};

const renderPage = () => render(<MemoryRouter initialEntries={["/admin/classrooms"]}><Routes><Route path="/admin/classrooms" element={<ClassroomManagement />} /><Route path="/admin/classrooms/:classroomId" element={<div>تم فتح إدارة الفصل</div>} /></Routes></MemoryRouter>);

describe("Admin Classroom Management page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAllClassrooms.mockResolvedValue({ success: true, data: [classroom] });
  });

  const showClassroom = async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "إدارة الفصول" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("المنهج"), { target: { value: "curriculum-1" } });
    fireEvent.change(screen.getByLabelText("الصف"), { target: { value: "grade-1" } });
    return screen.getByRole("link", { name: `إدارة الفصل ${classroom.name}` });
  };

  it("uses the simplified title and makes the whole card the only open action", async () => {
    const card = await showClassroom();
    expect(screen.queryByRole("button", { name: "فتح الفصل" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "فتح الفصل" })).not.toBeInTheDocument();
    expect(card).toHaveAttribute("href", "/admin/classrooms/classroom-1");
    expect(card).toHaveClass("focus-visible:ring-2");
  });

  it("opens the Hub when the classroom card is clicked and remains keyboard focusable", async () => {
    const card = await showClassroom();
    card.focus();
    expect(card).toHaveFocus();
    fireEvent.click(card);
    expect(await screen.findByText("تم فتح إدارة الفصل")).toBeInTheDocument();
  });
});
