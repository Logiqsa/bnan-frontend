import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherAssignmentDetails from "./TeacherAssignmentDetails";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  listSubmissions: vi.fn(),
  reviewSubmission: vi.fn(),
}));

vi.mock("@/api/teacherClassroomAssignmentsApi", () => ({
  teacherClassroomAssignmentsApi: mocks,
}));

vi.mock("@/layouts/DashboardLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

const assignment = {
  id: "assignment-1",
  title: "واجب تجريبي",
  description: "وصف الواجب",
  dueDate: "2030-01-01T10:00:00.000Z",
  totalPoints: 10,
};

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={["/portal/teacher/assignments/assignment-1"]}>
      <Routes>
        <Route path="/portal/teacher/assignments/:assignmentId" element={<TeacherAssignmentDetails />} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe("TeacherAssignmentDetails", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.listSubmissions.mockReset();
    mocks.reviewSubmission.mockReset();
    mocks.get.mockResolvedValue({ data: assignment });
  });

  it("renders student submissions when the API returns an array", async () => {
    mocks.listSubmissions.mockResolvedValue({ data: [{
      studentId: "student-1",
      fullName: "طالب تجريبي",
      hasSubmitted: true,
      submissionStatus: "submitted",
      submission: null,
    }] });

    renderPage();

    expect(await screen.findByText("طالب تجريبي")).toBeInTheDocument();
  });

  it("renders the empty state for an empty submissions array", async () => {
    mocks.listSubmissions.mockResolvedValue({ data: [] });

    renderPage();

    expect(await screen.findByText("لا يوجد طلاب مرتبطون بهذا الواجب.")).toBeInTheDocument();
  });

  it("renders the submissions error state when the response has no data", async () => {
    mocks.listSubmissions.mockResolvedValue({});

    renderPage();

    expect(await screen.findByText("تعذر تحميل التسليمات.")).toBeInTheDocument();
  });
});
