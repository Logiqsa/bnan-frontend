import { apiRequest } from "@/api/client";

export interface ApiNotification {
  id: string;
  type: string;
  key: string;
  title: string;
  body?: string;
  image?: string;
  resource?: { id?: string | null; model?: string | null } | null;
  navigation?: { screen?: string; target?: string; params?: Record<string, unknown>; [key: string]: unknown } | null;
  data?: Record<string, unknown>;
  isRead: boolean;
  status: "read" | "unread";
  readAt?: string | null;
  createdAt: string;
}

interface NotificationListResponse {
  success: true;
  results: number;
  unreadCount: number;
  data: ApiNotification[];
  pagination: { page: number; limit: number; totalResults: number; totalPages: number };
}

interface MarkReadResponse {
  success: true;
  data: { modifiedCount: number; unreadCount: number };
}

export const notificationsApi = {
  list: (limit = 50) => apiRequest<NotificationListResponse>(`/notifications?page=1&limit=${limit}`),
  markRead: (notificationIds: string[]) => apiRequest<MarkReadResponse>("/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ notificationIds }),
  }),
  markAllRead: () => apiRequest<MarkReadResponse>("/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ all: true }),
  }),
};
