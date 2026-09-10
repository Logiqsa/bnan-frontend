import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminNotificationLink, useNotifications } from "./useNotifications";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  toast: vi.fn(),
  toastError: vi.fn(),
  listeners: new Map<string, (payload?: unknown) => void>(),
}));

vi.mock("@/api/notificationsApi", () => ({
  notificationsApi: {
    list: mocks.list,
    markRead: mocks.markRead,
    markAllRead: mocks.markAllRead,
  },
}));
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: (event: string, listener: (payload?: unknown) => void) => { mocks.listeners.set(event, listener); },
    off: (event: string) => { mocks.listeners.delete(event); },
  }),
}));
vi.mock("sonner", () => ({ toast: Object.assign(mocks.toast, { error: mocks.toastError }) }));

const stored = {
  id: "notification-1", type: "teacher", key: "TEACHER_REGISTRATION_REQUEST",
  title: "طلب معلم", body: "طلب جديد", isRead: false as const, status: "unread" as const,
  createdAt: "2026-09-10T10:00:00.000Z",
};

describe("useNotifications", () => {
  beforeEach(() => {
    mocks.listeners.clear();
    mocks.list.mockReset().mockResolvedValue({ data: [stored], unreadCount: 1 });
    mocks.markRead.mockReset().mockResolvedValue({ data: { unreadCount: 0 } });
    mocks.markAllRead.mockReset().mockResolvedValue({ data: { unreadCount: 0 } });
    mocks.toast.mockClear();
    mocks.toastError.mockClear();
  });

  it("loads persisted notifications and prepends socket notifications in real time", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.items).toEqual([stored]));

    const live = { ...stored, id: "notification-2", title: "دفعة جديدة" };
    act(() => mocks.listeners.get("notification")?.(live));

    expect(result.current.items.map((item) => item.id)).toEqual(["notification-2", "notification-1"]);
    expect(result.current.unreadCount).toBe(2);
    expect(mocks.toast).toHaveBeenCalledWith("دفعة جديدة", { description: "طلب جديد" });
    act(() => mocks.listeners.get("newNotification")?.(live));
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });

  it("marks one notification and all notifications through the backend contract", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(1));

    await act(() => result.current.markRead("notification-1"));
    expect(mocks.markRead).toHaveBeenCalledWith(["notification-1"]);
    expect(result.current.unreadCount).toBe(0);

    act(() => mocks.listeners.get("notification")?.({ ...stored, id: "notification-2" }));
    await act(() => result.current.markAllRead());
    expect(mocks.markAllRead).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(0);
  });

  it.each([
    ["teacher_approval", "/admin?tab=teacher-applications"],
    ["registration_requests", "/admin?tab=users"],
    ["users", "/admin?tab=all-users"],
    ["classroom_change_requests", "/admin/classrooms"],
    ["global_notification_details", "/admin/notifications"],
    ["admin_payments", "/admin"],
  ])("maps backend target %s to an existing admin route", (target, route) => {
    expect(adminNotificationLink({
      ...stored,
      navigation: { target },
    })).toBe(route);
  });
});
