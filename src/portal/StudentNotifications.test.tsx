import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import StudentNotifications from "./StudentNotifications";

const mocks = vi.hoisted(() => ({ state: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), reload: vi.fn() }));
vi.mock("@/contexts/notifications-context", () => ({ useNotificationsContext: () => mocks.state() }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const notification = { id: "n1", type: "attendance", key: "STUDENT_ABSENT", title: "تنبيه حضور", body: "تم تسجيل الغياب", isRead: false, status: "unread" as const, createdAt: "2026-09-23T08:00:00.000Z", navigation: { target: "student_home" } };
const state = (changes = {}) => ({ items: [notification], unreadCount: 1, loading: false, error: null, reload: mocks.reload, markRead: mocks.markRead, markAllRead: mocks.markAllRead, ...changes });
const renderPage = () => render(<MemoryRouter><LanguageProvider><StudentNotifications /></LanguageProvider></MemoryRouter>);

describe("StudentNotifications", () => {
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.state.mockReset(); mocks.markRead.mockReset().mockResolvedValue(undefined); mocks.markAllRead.mockReset().mockResolvedValue(undefined); mocks.reload.mockReset().mockResolvedValue(undefined);
  });

  it("renders loading, empty and success unread states", () => {
    mocks.state.mockReturnValue(state({ items: [], unreadCount: 0, loading: true }));
    const loading = renderPage();
    expect(screen.getByLabelText("جاري تحميل الإشعارات")).toBeInTheDocument();
    loading.unmount();
    mocks.state.mockReturnValue(state({ items: [], unreadCount: 0 }));
    const empty = renderPage();
    expect(screen.getByText("لا توجد إشعارات حتى الآن")).toBeInTheDocument();
    empty.unmount();
    mocks.state.mockReturnValue(state());
    renderPage();
    expect(screen.getByText("تنبيه حضور")).toBeInTheDocument();
    expect(screen.getByText("1 إشعار غير مقروء")).toBeInTheDocument();
  });

  it("shows an error and retries", () => {
    mocks.state.mockReturnValue(state({ items: [], unreadCount: 0, error: "failed" }));
    renderPage();
    expect(screen.getByText("تعذر تحميل الإشعارات")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });

  it("marks one and all notifications through the shared notification state", async () => {
    mocks.state.mockReturnValue(state());
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "تحديد كمقروء" }));
    await waitFor(() => expect(mocks.markRead).toHaveBeenCalledWith("n1"));
    fireEvent.click(screen.getByRole("button", { name: "تحديد الكل كمقروء" }));
    await waitFor(() => expect(mocks.markAllRead).toHaveBeenCalledTimes(1));
  });
});
