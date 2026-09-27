import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import TeacherClassroomSessions from "./TeacherClassroomSessions";

const mocks = vi.hoisted(() => ({
  subjects: vi.fn(),
  students: vi.fn(),
  sessions: vi.fn(),
  recordings: vi.fn(),
  assignments: vi.fn(),
}));

vi.mock("@/api/classroomRecordingsApi", () => ({
  classroomRecordingsApi: {
    listSubjects: mocks.subjects,
    listStudents: mocks.students,
    listSessions: mocks.sessions,
    listRecordings: mocks.recordings,
  },
}));
vi.mock("@/api/teacherClassroomAssignmentsApi", () => ({
  teacherClassroomAssignmentsApi: { list: mocks.assignments },
}));
vi.mock("@/components/CourseClassroomChat", () => ({
  default: () => <div>محادثة الفصل التجريبية</div>,
}));
vi.mock("@/admin/zoom/ClassroomScheduleManagement", () => ({
  default: () => <div>جدول الفصل التجريبي</div>,
}));
vi.mock("@/layouts/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

const baseSubjects = {
  classroom: { id: "classroom-1", name: "فصل ألف" },
  grade: { id: "grade-1", name: "الصف الأول" },
  curriculum: { id: "curriculum-1", name: "المنهج المصري" },
  subjects: [{
    id: "subject-1",
    classroomSubjectId: "classroom-subject-1",
    subjectId: "subject-1",
    name: "الرياضيات",
    teacher: { id: "teacher-1", name: "المعلم" },
    isActive: true,
  }],
};

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/portal/teacher/classrooms/classroom-1"]}>
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <Routes>
            <Route path="/portal/teacher/classrooms/:classroomId" element={<TeacherClassroomSessions />} />
            <Route path="/portal/teacher/assignments/:assignmentId" element={<div>تفاصيل التسليمات</div>} />
          </Routes>
        </LanguageProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const openTab = (name: RegExp) => {
  const tab = screen.getByRole("tab", { name });
  fireEvent.mouseDown(tab, { button: 0 });
  fireEvent.click(tab);
};

describe("TeacherClassroomSessions classroom details", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.subjects.mockReset();
    mocks.students.mockReset();
    mocks.sessions.mockReset();
    mocks.recordings.mockReset();
    mocks.assignments.mockReset();
    mocks.subjects.mockResolvedValue({ data: baseSubjects });
    mocks.students.mockResolvedValue({ data: [{ studentId: "student-1", fullName: "طالب الفصل" }] });
    mocks.sessions.mockResolvedValue({ data: [] });
    mocks.recordings.mockResolvedValue({ data: [] });
    mocks.assignments.mockResolvedValue({ data: [] });
  });

  it("loads classroom header and exposes all detail tabs", async () => {
    renderPage();
    expect(await screen.findByText("فصل ألف")).toBeInTheDocument();
    expect(screen.getByText("المنهج المصري")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "نظرة عامة" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /التسجيلات/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /الواجبات/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /المحادثة/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Zoom" })).not.toBeInTheDocument();
    expect(await screen.findByText("المواد والمعلمون")).toBeInTheDocument();
    expect(screen.getByText("طالب الفصل")).toBeInTheDocument();
  });

  it("keeps the student section empty state independent", async () => {
    mocks.students.mockResolvedValueOnce({ data: [] });
    renderPage();
    expect(await screen.findByText("لا يوجد طلاب مرتبطون بهذا الفصل.")).toBeInTheDocument();
  });

  it("keeps each empty state independent", async () => {
    renderPage();
    openTab(/الجدول/);
    expect(await screen.findByText("جدول الفصل التجريبي")).toBeInTheDocument();
    openTab(/التسجيلات/);
    expect(await screen.findByText(/لا توجد تسجيلات متاحة حاليًا/)).toBeInTheDocument();
    openTab(/الواجبات/);
    expect(await screen.findByText(/لا توجد واجبات لهذا الفصل حاليًا/)).toBeInTheDocument();
    openTab(/المحادثة/);
    expect(await screen.findByText("محادثة الفصل التجريبية")).toBeInTheDocument();
  });

  it("does not let an assignments failure hide schedule data", async () => {
    mocks.assignments.mockRejectedValueOnce(new Error("forbidden"));
    renderPage();
    openTab(/الجدول/);
    expect(await screen.findByText("جدول الفصل التجريبي")).toBeInTheDocument();
    expect(mocks.assignments).toHaveBeenCalledWith("classroom-1");
  });

  it("does not navigate when clicking an assignment card", async () => {
    mocks.assignments.mockResolvedValueOnce({ data: [{
      id: "assignment-1",
      title: "واجب الفصل",
      dueDate: "2030-01-01T10:00:00.000Z",
      totalPoints: 10,
    }] });

    renderPage();
    openTab(/الواجبات/);

    const title = await screen.findByText("واجب الفصل");
    fireEvent.click(title);

    expect(screen.getByText("واجب الفصل")).toBeInTheDocument();
  });

  it("opens assignment submissions only from the submissions button", async () => {
    mocks.assignments.mockResolvedValueOnce({ data: [{
      id: "assignment-1",
      title: "واجب التسليمات",
      dueDate: "2030-01-01T10:00:00.000Z",
      totalPoints: 10,
    }] });

    renderPage();
    openTab(/الواجبات/);
    fireEvent.click(await screen.findByRole("button", { name: "عرض التسليمات" }));

    expect(await screen.findByText("تفاصيل التسليمات")).toBeInTheDocument();
  });
});
