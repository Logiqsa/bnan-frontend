import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import TeacherNotifications from "./TeacherNotifications";

const mocks = vi.hoisted(() => ({ state: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), reload: vi.fn() }));
vi.mock("@/contexts/notifications-context", () => ({ useNotificationsContext: () => mocks.state() }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const notification = { id: "n1", type: "classroom", key: "CLASSROOM_SCHEDULE_CREATED", title: "تم تحديد جدول الفصل", body: "تم تحديد جدول فصل 1", isRead: false, status: "unread" as const, createdAt: "2026-09-23T08:00:00.000Z", navigation: { target: "schedule", params: { classroomId: "classroom-1" } } };
const state = (changes = {}) => ({ items: [notification], unreadCount: 1, loading: false, error: null, reload: mocks.reload, markRead: mocks.markRead, markAllRead: mocks.markAllRead, ...changes });
const renderPage = () => render(<MemoryRouter><LanguageProvider><TeacherNotifications /></LanguageProvider></MemoryRouter>);

describe("TeacherNotifications", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.state.mockReset(); mocks.markRead.mockReset().mockResolvedValue(undefined); mocks.markAllRead.mockReset().mockResolvedValue(undefined); mocks.reload.mockReset().mockResolvedValue(undefined);
  });

  it("renders teacher notifications and marks them as read", async () => {
    mocks.state.mockReturnValue(state());
    renderPage();
    expect(screen.getByText("تم تحديد جدول الفصل")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /تم تحديد جدول الفصل/ }));
    await waitFor(() => expect(mocks.markRead).toHaveBeenCalledWith("n1"));
  });

  it("shows loading and empty states", () => {
    mocks.state.mockReturnValue(state({ items: [], unreadCount: 0, loading: true }));
    const loading = renderPage();
    expect(screen.getByLabelText("جاري تحميل الإشعارات")).toBeInTheDocument();
    loading.unmount();
    mocks.state.mockReturnValue(state({ items: [], unreadCount: 0 }));
    renderPage();
    expect(screen.getByText("لا توجد إشعارات حتى الآن")).toBeInTheDocument();
  });
});
