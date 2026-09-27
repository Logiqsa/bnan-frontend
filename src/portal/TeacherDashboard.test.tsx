import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherDashboard from "./TeacherDashboard";
import { LanguageProvider } from "@/i18n/LanguageContext";

const mocks = vi.hoisted(() => ({
  payout: vi.fn(),
  notifications: vi.fn(),
  courses: vi.fn(),
  requests: vi.fn(),
  sessions: vi.fn(),
}));

vi.mock("@/api/teacherPayoutProfileApi", () => ({ teacherPayoutProfileApi: { get: mocks.payout } }));
vi.mock("@/contexts/notifications-context", () => ({ useNotificationsContext: () => mocks.notifications() }));
vi.mock("@/api/coursesApi", () => ({ coursesApi: { myTeachingCourses: mocks.courses } }));
vi.mock("@/api/teacherRequestsApi", () => ({
  teacherPendingRequestsPageQueryKey: () => ["teacher-pending-requests"],
  teacherRequestsApi: { listPending: mocks.requests },
}));
vi.mock("@/hooks/useTeacherUpcomingSessions", () => ({ useTeacherUpcomingSessions: () => mocks.sessions() }));
vi.mock("@/portal/PortalAuthContext", () => ({ usePortalAuth: () => ({ user: { fullName: "معلم" } }) }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><LanguageProvider><TeacherDashboard /></LanguageProvider></MemoryRouter>
  </QueryClientProvider>,
);

describe("TeacherDashboard to-do card", () => {
  beforeEach(() => {
    mocks.payout.mockReset();
    mocks.notifications.mockReset().mockReturnValue({ items: [] });
    mocks.courses.mockReset().mockResolvedValue([]);
    mocks.requests.mockReset().mockResolvedValue({ data: [], pagination: { total: 0 } });
    mocks.sessions.mockReset().mockReturnValue({ isLoading: false, isFetching: false, allSourcesFailed: false, lessons: [], retry: vi.fn() });
  });

  it("asks the teacher to complete payout details when missing", async () => {
    mocks.payout.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText("أكمل بيانات الاستلام")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إضافة البيانات" })).toHaveAttribute("href", "/portal/teacher/settings");
  });

  it("hides payout setup and shows pending grading tasks", async () => {
    mocks.payout.mockResolvedValue({ method: "wallet", accountHolderName: "معلم" });
    mocks.notifications.mockReturnValue({ items: [{
      id: "notification-1",
      key: "ASSIGNMENT_SUBMITTED",
      title: "تم تسليم واجب",
      body: "",
      isRead: false,
      status: "unread",
      createdAt: "2026-09-27T10:00:00.000Z",
      data: { assignmentId: "assignment-1", submissionId: "submission-1", assignmentTitle: "واجب رياضيات", studentName: "فهد" },
      navigation: { target: "assignment_submissions", params: { assignmentId: "assignment-1", submissionId: "submission-1" } },
    }] });
    renderPage();
    expect(await screen.findByText("واجبات تحتاج إلى تصحيح")).toBeInTheDocument();
    expect(screen.getByText("فهد")).toBeInTheDocument();
    expect(screen.getByText(/واجب رياضيات/)).toBeInTheDocument();
    expect(screen.queryByText("أكمل بيانات الاستلام")).not.toBeInTheDocument();
  });
});
