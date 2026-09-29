import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherDashboard from "./TeacherDashboard";
import { LanguageProvider } from "@/i18n/LanguageContext";

const mocks = vi.hoisted(() => ({
  payout: vi.fn(),
  notifications: vi.fn(),
  requests: vi.fn(),
  sessions: vi.fn(),
  statistics: vi.fn(),
}));

vi.mock("@/api/teacherPayoutProfileApi", () => ({
  teacherPayoutProfileApi: { get: mocks.payout },
}));
vi.mock("@/api/teacherRequestsApi", () => ({
  teacherPendingRequestsPageQueryKey: () => ["teacher-pending-requests"],
  teacherRequestsApi: { listPending: mocks.requests },
}));
vi.mock("@/hooks/useTeacherUpcomingSessions", () => ({
  useTeacherUpcomingSessions: () => mocks.sessions(),
}));
vi.mock("@/api/teacherSessionStatisticsApi", () => ({
  teacherSessionStatisticsApi: { getMine: mocks.statistics },
}));
vi.mock("@/portal/PortalAuthContext", () => ({
  usePortalAuth: () => ({ user: { fullName: "معلم" } }),
}));
vi.mock("@/layouts/DashboardLayout", async () => {
  const { NotificationsContext } =
    await import("@/contexts/notifications-context");
  return {
    default: ({ children }: { children: React.ReactNode }) => (
      <NotificationsContext.Provider value={mocks.notifications()}>
        <main>{children}</main>
      </NotificationsContext.Provider>
    ),
  };
});

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <LanguageProvider>
          <TeacherDashboard />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("TeacherDashboard notifications provider and to-do card", () => {
  beforeEach(() => {
    mocks.payout.mockReset();
    mocks.notifications.mockReset().mockReturnValue({
      items: [],
      unreadCount: 0,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    mocks.requests
      .mockReset()
      .mockResolvedValue({ data: [], pagination: { total: 0 } });
    mocks.sessions
      .mockReset()
      .mockReturnValue({
        isLoading: false,
        isFetching: false,
        allSourcesFailed: false,
        lessons: [],
        retry: vi.fn(),
      });
    mocks.statistics.mockReset().mockResolvedValue({
      teacherId: "teacher-1",
      sessionsCount: 4,
      totalMinutes: 150,
      totalHours: 2.5,
    });
  });

  it("asks the teacher to complete payout details when missing", async () => {
    mocks.payout.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText("أكمل بيانات الاستلام")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "إضافة البيانات" }),
    ).toHaveAttribute("href", "/portal/teacher/settings");
  });

  it("reads notifications from the existing layout provider and shows pending grading tasks", async () => {
    mocks.payout.mockResolvedValue({
      method: "wallet",
      accountHolderName: "معلم",
    });
    mocks.notifications.mockReturnValue({
      items: [
        {
          id: "notification-1",
          key: "ASSIGNMENT_SUBMITTED",
          title: "تم تسليم واجب",
          body: "",
          isRead: false,
          status: "unread",
          createdAt: "2026-09-27T10:00:00.000Z",
          data: {
            assignmentId: "assignment-1",
            submissionId: "submission-1",
            assignmentTitle: "واجب رياضيات",
            studentName: "فهد",
          },
          navigation: {
            target: "assignment_submissions",
            params: {
              assignmentId: "assignment-1",
              submissionId: "submission-1",
            },
          },
        },
      ],
      unreadCount: 1,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    renderPage();
    expect(
      await screen.findByText("واجبات تحتاج إلى تصحيح"),
    ).toBeInTheDocument();
    expect(screen.getByText("فهد")).toBeInTheDocument();
    expect(screen.getByText(/واجب رياضيات/)).toBeInTheDocument();
    expect(screen.queryByText("أكمل بيانات الاستلام")).not.toBeInTheDocument();
  });

  it("shows notifications, teaching summary, pending requests, and upcoming sessions", async () => {
    mocks.payout.mockResolvedValue({
      method: "wallet",
      accountHolderName: "معلم",
    });
    mocks.notifications.mockReturnValue({
      items: [
        {
          id: "notification-2",
          key: "TEACHER_ASSIGNMENT",
          title: "تم تعيينك في فصل",
          body: "تم تعيينك كمعلّم لمادة الرياضيات.",
          isRead: false,
          status: "unread",
          createdAt: "2026-09-27T10:00:00.000Z",
          data: {},
          navigation: null,
        },
      ],
      unreadCount: 1,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    renderPage();

    expect(await screen.findByText("الإشعارات")).toBeInTheDocument();
    expect(screen.getByText("ملخص التدريس")).toBeInTheDocument();
    expect(screen.getByText("٢٫٥")).toBeInTheDocument();
    expect(screen.getByText("٤")).toBeInTheDocument();
    expect(screen.getByText("الطلبات المعلقة")).toBeInTheDocument();
    expect(screen.getByText("الحصص القادمة")).toBeInTheDocument();
    expect(screen.getByText("تم تعيينك في فصل")).toBeInTheDocument();
    expect(screen.queryByText("ملخص الدورات والفصول")).not.toBeInTheDocument();
  });
});
