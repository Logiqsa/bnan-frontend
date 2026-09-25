import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyCourses from "./MyCourses";

const mocks = vi.hoisted(() => ({
  enrollments: vi.fn(),
  publicCourses: vi.fn(),
}));

vi.mock("@/api/coursesApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/coursesApi")>()),
  coursesApi: {
    myEnrollments: mocks.enrollments,
    listPublic: mocks.publicCourses,
  },
}));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/CourseRegistrationDialog", () => ({
  default: ({ course }: { course: { name: string } }) => <div role="dialog">التسجيل في {course.name}</div>,
}));

const course = {
  id: "course-1",
  name: "دورة الرياضيات",
  description: "الوصف",
  teacher: { name: "المعلم" },
  eligibleGrades: [],
  currency: "EGP",
  enrollmentModes: {
    group: { enabled: true, price: 0 },
    individual: { enabled: true, price: 0 },
  },
  enrollmentOpen: true,
  status: "active" as const,
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><MyCourses /></MemoryRouter></QueryClientProvider>);
};

describe("MyCourses re-enrollment action", () => {
  beforeEach(() => {
    mocks.publicCourses.mockReset().mockResolvedValue([course]);
  });

  it.each(["completed", "cancelled", "refunded", "expired", "removed"] as const)(
    "shows re-enrollment for a %s enrollment and opens the existing dialog",
    async (status) => {
      mocks.enrollments.mockReset().mockResolvedValue([{
        id: `enrollment-${status}`,
        course,
        mode: "individual",
        status,
        price: 0,
        currency: "EGP",
      }]);
      renderPage();
      const action = await screen.findByRole("button", { name: "إعادة الاشتراك" });
      fireEvent.click(action);
      expect(screen.getByRole("dialog")).toHaveTextContent("التسجيل في دورة الرياضيات");
    },
  );

  it.each(["active", "pending"] as const)("does not show re-enrollment for a %s enrollment", async (status) => {
    mocks.enrollments.mockReset().mockResolvedValue([{
      id: `enrollment-${status}`,
      course,
      mode: "group",
      status,
      price: 0,
      currency: "EGP",
    }]);
    renderPage();
    await screen.findByText("دورة الرياضيات");
    expect(screen.queryByRole("button", { name: "إعادة الاشتراك" })).not.toBeInTheDocument();
  });
});
