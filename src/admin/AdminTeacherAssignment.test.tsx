import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminTeacherAssignment from "./AdminTeacherAssignment";

Object.assign(globalThis, { ResizeObserver: class { observe() {} unobserve() {} disconnect() {} } });
Element.prototype.scrollIntoView = vi.fn();

const mocks = vi.hoisted(() => ({
  listCurriculums: vi.fn(), listGrades: vi.fn(), listClassrooms: vi.fn(), listSubjects: vi.fn(), listTeachers: vi.fn(), assign: vi.fn(),
}));

vi.mock("@/api/adminTeacherAssignmentApi", () => ({ adminTeacherAssignmentApi: mocks }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AdminTeacherAssignment /></MemoryRouter></QueryClientProvider>);

describe("AdminTeacherAssignment", () => {
  it("cascades curriculum, grade, classroom, and subject choices", async () => {
    mocks.listCurriculums.mockResolvedValue({ success: true, data: [{ id: "curriculum-1", name: "منهج" }] });
    mocks.listGrades.mockResolvedValue({ success: true, data: [{ id: "grade-1", name: "صف" }] });
    mocks.listClassrooms.mockResolvedValue({ success: true, data: [{ id: "classroom-1", name: "فصل", curriculum: { id: "curriculum-1" }, grade: { id: "grade-1" } }] });
    mocks.listSubjects.mockResolvedValue({ success: true, data: { subjects: [{ id: "classroom-subject-1", classroomSubjectId: "classroom-subject-1", subjectId: "subject-1", name: "رياضيات", isActive: true, teacher: { id: "old-teacher", name: "قديم" } }] } });
    mocks.listTeachers.mockResolvedValue([]);
    renderPage();

    fireEvent.click(await screen.findByRole("combobox", { name: "المنهج" }));
    fireEvent.click(await screen.findByText("منهج"));
    fireEvent.click(await screen.findByRole("combobox", { name: "الصف" }));
    fireEvent.click(await screen.findByText("صف"));
    fireEvent.click(await screen.findByRole("combobox", { name: "الفصل" }));
    fireEvent.click(await screen.findByText("فصل"));

    await waitFor(() => expect(mocks.listSubjects).toHaveBeenCalledWith("classroom-1"));
    expect(screen.getByRole("combobox", { name: "المادة" })).toBeEnabled();
  });

  it("shows only eligible teachers and sends Teacher._id", async () => {
    mocks.listCurriculums.mockResolvedValue({ success: true, data: [{ id: "curriculum-1", name: "منهج" }] });
    mocks.listGrades.mockResolvedValue({ success: true, data: [{ id: "grade-1", name: "صف" }] });
    mocks.listClassrooms.mockResolvedValue({ success: true, data: [{ id: "classroom-1", name: "فصل", curriculum: { id: "curriculum-1" }, grade: { id: "grade-1" } }] });
    mocks.listSubjects.mockResolvedValue({ success: true, data: { subjects: [{ id: "classroom-subject-1", classroomSubjectId: "classroom-subject-1", subjectId: "subject-1", name: "رياضيات", isActive: true, teacher: { id: "old-teacher", name: "قديم" } }] } });
    mocks.listTeachers.mockResolvedValue([
      { id: "user-1", teacherId: "teacher-profile-1", fullName: "مؤهل", teacherStatus: "approved", curriculums: [{ id: "curriculum-1" }] },
      { id: "user-2", teacherId: "teacher-profile-2", fullName: "غير مؤهل", teacherStatus: "approved", curriculums: [{ id: "curriculum-2" }] },
    ]);
    mocks.assign.mockResolvedValue({ success: true, data: {} });
    renderPage();

    for (const [label, option] of [["المنهج", "منهج"], ["الصف", "صف"], ["الفصل", "فصل"], ["المادة", "رياضيات"]]) {
      fireEvent.click(await screen.findByRole("combobox", { name: label }));
      fireEvent.click(await screen.findByText(option));
    }
    fireEvent.click(await screen.findByRole("combobox", { name: "المعلم الجديد" }));
    expect(await screen.findByText("مؤهل")).toBeInTheDocument();
    expect(screen.queryByText("غير مؤهل")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("مؤهل"));
    fireEvent.click(screen.getByRole("button", { name: "تأكيد التعيين" }));
    fireEvent.click(await screen.findByRole("button", { name: "تأكيد التعيين" }));
    await waitFor(() => expect(mocks.assign).toHaveBeenCalledWith("classroom-1", "subject-1", "teacher-profile-1"));
  });
});
