import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notificationsApi, type ApiNotification } from "@/api/notificationsApi";
import type { PortalRole } from "@/api/types";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

export type Notification = ApiNotification;

const localizedText = (value: unknown, language: "ar" | "en" = "ar") => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const translations = value as Record<string, unknown>;
    const selected = translations[language] ?? translations.ar ?? translations.en;
    return typeof selected === "string" ? selected : "";
  }
  return "";
};

const mergeNotifications = (incoming: Notification[], current: Notification[]) => {
  const byId = new Map<string, Notification>();
  [...incoming, ...current].forEach((item) => {
    if (!byId.has(item.id)) byId.set(item.id, item);
  });
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 100);
};

const adminNotificationRoutes: Record<string, string> = {
  teacher_approval: "/admin?tab=teacher-applications",
  registration_requests: "/admin/students",
  students: "/admin/students",
  parents: "/admin/parents",
  users: "/admin?tab=all-users",
  classroom_change_requests: "/admin/classrooms",
  classroom_details: "/admin/classrooms",
  global_notification_details: "/admin/notifications",
  admin_payments: "/admin",
  admin_subscriptions: "/admin",
  salary_approvals: "/admin",
  system_health: "/admin",
  chat_room: "/admin/messages",
};

const teacherNotificationRoutes: Record<string, string> = {
  teacher_home: "/portal/teacher",
  teacher_requests: "/portal/teacher/requests",
  chat_room: "/portal/teacher/messages",
  schedule: "/portal/teacher/schedule",
  session_details: "/portal/teacher/schedule",
  active_session: "/portal/teacher/schedule",
  session_summary: "/portal/teacher/schedule",
  teacher_students: "/portal/teacher/courses",
  classroom_details: "/portal/teacher/courses",
  courses: "/portal/teacher/courses",
};

const studentNotificationRoutes: Record<string, string> = {
  student_home: "/portal/student",
  schedule: "/portal/student/schedule",
  active_session: "/portal/student/schedule",
  session_summary: "/portal/student/schedule",
  global_notification_details: "/portal/student/notifications",
  chat_room: "/portal/student/messages",
};

const notificationParam = (
  notification: Notification,
  key: string,
): string | undefined => {
  const value = notification.navigation?.params?.[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

const teacherNotificationLink = (
  notification: Notification,
  target: string | undefined,
): string | undefined => {
  if (notification.type === "chat_room" || target === "chat_room") {
    const roomId = notificationParam(notification, "roomId");
    return roomId
      ? `/portal/teacher/messages?${new URLSearchParams({ roomId }).toString()}`
      : teacherNotificationRoutes.chat_room;
  }

  if (target === "session_details" || target === "session_summary") {
    const classroomId = notificationParam(notification, "classroomId");
    const sessionId = notificationParam(notification, "sessionId");
    if (classroomId && sessionId) {
      return `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}/sessions/${encodeURIComponent(sessionId)}`;
    }
    return teacherNotificationRoutes[target];
  }

  if (target === "classroom_details") {
    const classroomId = notificationParam(notification, "classroomId");
    return classroomId
      ? `/portal/teacher/classrooms/${encodeURIComponent(classroomId)}`
      : teacherNotificationRoutes.classroom_details;
  }

  return target ? teacherNotificationRoutes[target] : undefined;
};

export const notificationLink = (
  notification: Notification,
  role: PortalRole,
): string | undefined => {
  const target = notification.navigation?.target || notification.navigation?.screen;
  if (role === "admin") {
    if (notification.type === "chat_room" || target === "chat_room") {
      const roomId = notificationParam(notification, "roomId");
      return roomId
        ? `/admin/messages?${new URLSearchParams({ roomId }).toString()}`
        : adminNotificationRoutes.chat_room;
    }
    return typeof target === "string" ? adminNotificationRoutes[target] : undefined;
  }
  if (role === "teacher")
    return teacherNotificationLink(
      notification,
      typeof target === "string" ? target : undefined,
    );
  if (role === "student") {
    if (notification.type === "chat_room" || target === "chat_room") {
      const roomId = notificationParam(notification, "roomId");
      return roomId
        ? `/portal/student/messages?${new URLSearchParams({ roomId }).toString()}`
        : studentNotificationRoutes.chat_room;
    }
    return typeof target === "string" ? studentNotificationRoutes[target] : undefined;
  }
  return undefined;
};

export const adminNotificationLink = (notification: Notification): string | undefined =>
  notificationLink(notification, "admin");

export function useNotifications(language?: "ar" | "en") {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const receivedIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    // Changing language must refetch because the backend localizes title/body.
    void language;
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.list(100);
      setItems((current) => mergeNotifications(response.data, current));
      setUnreadCount(response.unreadCount);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر تحميل الإشعارات.");
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void load();
    const socket = getSocket();
    const receive = (payload: Notification) => {
      const notification = {
        ...payload,
        // Some backend emitters format before a request language is available
        // and therefore send the bilingual template object over the socket.
        title: localizedText(payload?.title, language),
        body: localizedText(payload?.body, language) || undefined,
      };
      if (!notification?.id) return;
      if (receivedIds.current.has(notification.id)) return;
      receivedIds.current.add(notification.id);
      setItems((current) => mergeNotifications([notification], current));
      setUnreadCount((current) => current + (notification.isRead ? 0 : 1));
      toast(notification.title, { description: notification.body });
    };
    const realtimeEvents = ["notification", "newNotification", "notification:new"];
    realtimeEvents.forEach((event) => socket.on(event, receive));
    socket.on("connect", load);
    return () => {
      realtimeEvents.forEach((event) => socket.off(event, receive));
      socket.off("connect", load);
    };
  }, [load, language]);

  const markRead = useCallback(async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target || target.isRead) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, isRead: true, status: "read" } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      const response = await notificationsApi.markRead([id]);
      setUnreadCount(response.data.unreadCount);
    } catch (reason) {
      setItems((current) => current.map((item) => item.id === id ? target : item));
      setUnreadCount((current) => current + 1);
      throw reason;
    }
  }, [items]);

  const markAllRead = useCallback(async () => {
    const previousItems = items;
    const previousCount = unreadCount;
    setItems((current) => current.map((item) => ({ ...item, isRead: true, status: "read" })));
    setUnreadCount(0);
    try {
      const response = await notificationsApi.markAllRead();
      setUnreadCount(response.data.unreadCount);
    } catch (reason) {
      setItems(previousItems); setUnreadCount(previousCount);
      throw reason;
    }
  }, [items, unreadCount]);

  return useMemo(() => ({ items, unreadCount, loading, error, reload: load, markRead, markAllRead }), [items, unreadCount, loading, error, load, markRead, markAllRead]);
}
