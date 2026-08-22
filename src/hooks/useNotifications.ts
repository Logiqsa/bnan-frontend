import { useState } from "react";

export interface Notification {
  id: string;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// بيانات تجريبية مؤقتة لعرض التصميم فقط — تُستبدل لاحقًا بمصدر البيانات الفعلي للإشعارات.
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "تم تفعيل حسابك",
    body: "يمكنك الآن متابعة جدول حصصك.",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    title: "حصة جديدة مضافة للجدول",
    body: "راجع جدولك للاطلاع على الموعد.",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export function useNotifications() {
  // TODO: يستبدل بمصدر البيانات الفعلي عند تحديده (بدون تخزين حقيقي حاليًا)
  const [items, setItems] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const markRead = (id: string) => {
    setItems((current) => current.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = () => {
    setItems((current) => current.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return { items, unreadCount, markRead, markAllRead };
}
