import { useCallback, useEffect, useMemo, useState } from "react";
import { notificationsApi, type ApiNotification } from "@/api/notificationsApi";
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

export const adminNotificationLink = (notification: Notification): string | undefined => {
  const target = notification.navigation?.target || notification.navigation?.screen;
  const routes: Record<string, string> = {
    teacher_approval: "/admin?tab=teacher-applications",
    registration_requests: "/admin?tab=users",
    students: "/admin?tab=users",
    parents: "/admin?tab=users",
    users: "/admin?tab=all-users",
    classroom_change_requests: "/admin/classrooms",
    classroom_details: "/admin/classrooms",
    global_notification_details: "/admin/notifications",
    admin_payments: "/admin",
    admin_subscriptions: "/admin",
    salary_approvals: "/admin",
    system_health: "/admin",
    chat_room: "/admin",
  };
  return typeof target === "string" ? routes[target] : undefined;
};

export function useNotifications(language?: "ar" | "en") {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setItems((current) => mergeNotifications([notification], current));
      setUnreadCount((current) => current + (notification.isRead ? 0 : 1));
      toast(notification.title, { description: notification.body });
    };
    socket.on("notification", receive);
    socket.on("connect", load);
    return () => {
      socket.off("notification", receive);
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
