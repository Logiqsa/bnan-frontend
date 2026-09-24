import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminNotificationLink,
  notificationLink,
  useNotifications,
} from "./useNotifications";

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
    ["registration_requests", "/admin/students"],
    ["students", "/admin/students"],
    ["parents", "/admin/parents"],
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

  it.each([
    ["teacher_requests", "/portal/teacher/requests"],
    ["schedule", "/portal/teacher/schedule"],
    ["active_session", "/portal/teacher/schedule"],
    ["teacher_home", "/portal/teacher"],
    ["teacher_students", "/portal/teacher/courses"],
  ])("maps backend target %s to an existing teacher route", (target, route) => {
    expect(notificationLink({
      ...stored,
      navigation: { target },
    }, "teacher")).toBe(route);
  });

  it("routes teacher chat notifications to the teacher messages page", () => {
    expect(notificationLink({
      ...stored,
      navigation: { target: "chat_room" },
    }, "teacher")).toBe("/portal/teacher/messages");

    expect(notificationLink({
      ...stored,
      type: "chat_room",
      navigation: null,
    }, "teacher")).toBe("/portal/teacher/messages");
  });

  it("deep-links teacher chat notifications when a room ID is available", () => {
    expect(notificationLink({
      ...stored,
      navigation: { target: "chat_room", params: { roomId: "room-1" } },
    }, "teacher")).toBe("/portal/teacher/messages?roomId=room-1");
  });

  it.each(["session_details", "session_summary"])(
    "deep-links teacher %s notifications when classroom and session IDs are available",
    (target) => {
      expect(notificationLink({
        ...stored,
        navigation: {
          target,
          params: { classroomId: "classroom-1", sessionId: "session-1" },
        },
      }, "teacher")).toBe(
        "/portal/teacher/classrooms/classroom-1/sessions/session-1",
      );
    },
  );

  it.each(["session_details", "session_summary"])(
    "keeps the teacher schedule fallback for %s without both IDs",
    (target) => {
      expect(notificationLink({
        ...stored,
        navigation: { target, params: { sessionId: "session-1" } },
      }, "teacher")).toBe("/portal/teacher/schedule");
    },
  );

  it.each(["session_details", "session_summary"])(
    "keeps the teacher schedule fallback for %s without identifiers",
    (target) => {
      expect(notificationLink({
        ...stored,
        navigation: { target },
      }, "teacher")).toBe("/portal/teacher/schedule");
    },
  );

  it("deep-links classroom details and preserves its existing fallback", () => {
    expect(notificationLink({
      ...stored,
      navigation: {
        target: "classroom_details",
        params: { classroomId: "classroom-1" },
      },
    }, "teacher")).toBe("/portal/teacher/classrooms/classroom-1");

    expect(notificationLink({
      ...stored,
      navigation: { target: "classroom_details" },
    }, "teacher")).toBe("/portal/teacher/courses");
  });

  it("routes admin chat notifications to admin messages and preserves unsupported roles", () => {
    expect(notificationLink({
      ...stored,
      navigation: { target: "chat_room", params: { roomId: "room-1" } },
    }, "admin")).toBe("/admin/messages?roomId=room-1");
    expect(notificationLink({
      ...stored,
      navigation: { target: "chat_room" },
    }, "admin")).toBe("/admin/messages");
    expect(notificationLink({
      ...stored,
      navigation: { target: "chat_room", params: { roomId: "room-1" } },
    }, "student")).toBe("/portal/student/messages?roomId=room-1");
  });

  it("routes Student chat notifications with a safe messages fallback", () => {
    expect(notificationLink({
      ...stored,
      navigation: { target: "chat_room", params: { roomId: "room-1" } },
    }, "student")).toBe("/portal/student/messages?roomId=room-1");
    expect(notificationLink({
      ...stored,
      type: "chat_room",
      navigation: null,
    }, "student")).toBe("/portal/student/messages");
  });

  it.each([
    ["student_home", "/portal/student"],
    ["schedule", "/portal/student/schedule"],
    ["active_session", "/portal/student/schedule"],
    ["session_summary", "/portal/student/schedule"],
    ["global_notification_details", "/portal/student/notifications"],
  ])("maps supported Student target %s without inventing routes", (target, route) => {
    expect(notificationLink({ ...stored, navigation: { target } }, "student")).toBe(route);
  });

  it.each(["assignment_details", "subscription", "certificates"])(
    "does not navigate Student target %s before its page exists",
    (target) => {
      expect(notificationLink({ ...stored, navigation: { target } }, "student")).toBeUndefined();
    },
  );

  it("removes every realtime listener on unmount", async () => {
    const { unmount } = renderHook(() => useNotifications());
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    expect([...mocks.listeners.keys()].sort()).toEqual(["connect", "newNotification", "notification", "notification:new"].sort());
    unmount();
    expect(mocks.listeners.size).toBe(0);
  });
});
