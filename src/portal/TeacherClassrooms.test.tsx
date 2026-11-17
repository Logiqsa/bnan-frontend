import { act, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import TeacherClassrooms from "./TeacherClassrooms";

const mocks = vi.hoisted(() => ({
  regular: vi.fn(),
  courses: vi.fn(),
}));

vi.mock("@/api/teacherClassroomsApi", () => ({
  teacherClassroomsApi: { listMine: mocks.regular },
}));
vi.mock("@/api/coursesApi", () => ({
  coursesApi: { myTeachingCourses: mocks.courses },
}));
vi.mock("@/layouts/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <LanguageProvider>
          <TeacherClassrooms />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("TeacherClassrooms", () => {
  beforeEach(() => {
    mocks.regular.mockReset();
    mocks.courses.mockReset();
  });

  it("waits for regular and course classrooms before rendering the list", async () => {
    let resolveCourses!: (value: unknown[]) => void;
    mocks.regular.mockResolvedValue([
      {
        assignmentId: "regular-assignment-1",
        classroomId: "regular-classroom-1",
        classroomName: "فصل عادي",
        registrationMode: "gulf",
      },
    ]);
    mocks.courses.mockReturnValue(
      new Promise<unknown[]>((resolve) => {
        resolveCourses = resolve;
      }),
    );

    renderPage();

    expect(await screen.findByLabelText("جاري تحميل الفصول...")).toBeInTheDocument();
    expect(screen.queryByText("فصل عادي")).not.toBeInTheDocument();

    await act(async () => {
      resolveCourses([
        {
          course: { id: "course-1", name: "دورة تدريبية" },
          groups: [
            {
              id: "group-1",
              name: "مجموعة الدورة",
              classroom: { id: "course-classroom-1", name: "فصل الدورة" },
              studentsCount: 1,
            },
          ],
        },
      ]);
    });

    expect(await screen.findByText("فصل عادي")).toBeInTheDocument();
    expect(screen.getByText("فصل الدورة")).toBeInTheDocument();

    const regularCardLink = screen.getByText("فصل عادي").closest("a");
    expect(regularCardLink).toHaveAttribute(
      "href",
      "/portal/teacher/classrooms/regular-classroom-1",
    );

    const courseCardLink = screen.getByText("فصل الدورة").closest("a");
    expect(courseCardLink).toHaveAttribute(
      "href",
      "/portal/teacher/courses/course-1/groups/group-1",
    );
    expect(within(courseCardLink!).getByText("مجموعة الدورة")).toBeInTheDocument();
  });
});
