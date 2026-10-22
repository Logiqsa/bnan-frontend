import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClassroomManagement from "./ClassroomManagement";

const mocks = vi.hoisted(() => ({ listAllClassrooms: vi.fn(), deleteClassroom: vi.fn() }));

vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { role: "admin" } }) }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/api/classroomRecordingsApi", () => ({ classroomRecordingsApi: { listAllClassrooms: mocks.listAllClassrooms, deleteClassroom: mocks.deleteClassroom } }));
vi.mock("@/api/classroomZoomApi", () => ({ classroomZoomApi: {} }));
const classroom = {
  id: "classroom-1",
  name: "أول ابتدائي - عربي",
  isActive: true,
  curriculum: { id: "curriculum-1", name: "المنهج المصري", registrationMode: "egyptian" },
  grade: { id: "grade-1", name: "الصف الأول الابتدائي" },
  zoomAssignmentMode: "manual",
  createdAt: "2026-09-24T00:00:00.000Z",
};
const sharedClassroom = {
  ...classroom,
  id: "shared-classroom-1",
  name: "أول ابتدائي - مشترك",
  classroomKind: "shared",
  sharedAcademicTargets: [
    { curriculum: "curriculum-1", grade: "grade-1" },
    { curriculum: "curriculum-1", grade: "grade-2" },
  ],
};
const gulfPrivateClassroom = {
  ...classroom,
  id: "gulf-private-1",
  name: "أحمد - الرياضيات",
  classroomKind: "private",
  curriculum: { id: "curriculum-gulf", name: "المنهج السعودي", registrationMode: "gulf" },
  grade: { id: "grade-gulf-1", name: "الأول الابتدائي - سعودي" },
};

const renderPage = () => render(<MemoryRouter initialEntries={["/admin/classrooms"]}><Routes><Route path="/admin/classrooms" element={<ClassroomManagement />} /><Route path="/admin/classrooms/:classroomId" element={<div>تم فتح إدارة الفصل</div>} /></Routes></MemoryRouter>);

describe("Admin Classroom Management page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAllClassrooms.mockResolvedValue({ success: true, data: [classroom] });
    mocks.deleteClassroom.mockResolvedValue({ success: true, data: { classroomId: classroom.id, status: "archived", alreadyArchived: false } });
  });

  const showClassroom = async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "إدارة الفصول" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("المنهج"), { target: { value: "curriculum-1" } });
    fireEvent.change(screen.getByLabelText("المرحلة"), { target: { value: "primary" } });
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

  it("separates Egyptian Arabic and shared classrooms into tabs", async () => {
    mocks.listAllClassrooms.mockResolvedValue({ success: true, data: [classroom, sharedClassroom] });
    renderPage();
    await screen.findByRole("heading", { name: "إدارة الفصول" });
    fireEvent.change(screen.getByLabelText("المنهج"), { target: { value: "curriculum-1" } });
    fireEvent.change(screen.getByLabelText("المرحلة"), { target: { value: "primary" } });
    expect(screen.getByRole("link", { name: `إدارة الفصل ${classroom.name}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /مشترك/ }));
    expect(screen.getByRole("link", { name: "إدارة الفصل أول ابتدائي - مشترك" })).toHaveAttribute("href", "/admin/classrooms/shared-classroom-1");
    expect(screen.queryByRole("link", { name: `إدارة الفصل ${classroom.name}` })).not.toBeInTheDocument();
  });

  it("confirms deletion and removes the archived classroom from the list", async () => {
    await showClassroom();
    fireEvent.click(screen.getByRole("button", { name: `حذف الفصل ${classroom.name}` }));
    expect(screen.getByRole("heading", { name: `حذف الفصل «${classroom.name}»؟` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الحذف" }));
    expect(mocks.deleteClassroom).toHaveBeenCalledWith(classroom.id);
    expect(await screen.findByText("لا توجد فصول متاحة")).toBeInTheDocument();
  });

  it("filters non-Egyptian classrooms by their real classroom kind", async () => {
    mocks.listAllClassrooms.mockResolvedValue({ success: true, data: [gulfPrivateClassroom] });
    renderPage();
    await screen.findByRole("heading", { name: "إدارة الفصول" });
    fireEvent.change(screen.getByLabelText("المنهج"), { target: { value: "curriculum-gulf" } });
    fireEvent.change(screen.getByLabelText("المرحلة"), { target: { value: "primary" } });
    expect(screen.getByText("لا توجد فصول في هذا القسم")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /خاص/ }));
    expect(screen.getByRole("link", { name: `إدارة الفصل ${gulfPrivateClassroom.name}` })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /مشترك/ })).not.toBeInTheDocument();
  });
});
