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

export interface NotificationListResponse {
  success: true;
  results: number;
  unreadCount: number;
  data: ApiNotification[];
  pagination: { page: number; limit: number; totalResults: number; totalPages: number };
}

type RawNotificationListResponse = Partial<NotificationListResponse> & {
  data?: ApiNotification[] | {
    data?: ApiNotification[];
    notifications?: ApiNotification[];
    unreadCount?: number;
    pagination?: NotificationListResponse["pagination"];
  };
  notifications?: ApiNotification[];
};

const normalizeList = (response: RawNotificationListResponse): NotificationListResponse => {
  const nested = !Array.isArray(response.data) && response.data ? response.data : undefined;
  const data = Array.isArray(response.data)
    ? response.data
    : nested?.notifications || nested?.data || response.notifications || [];
  return {
    success: true,
    results: response.results ?? data.length,
    unreadCount: response.unreadCount ?? nested?.unreadCount ?? data.filter((item) => !item.isRead).length,
    data,
    pagination: response.pagination ?? nested?.pagination ?? { page: 1, limit: data.length, totalResults: data.length, totalPages: 1 },
  };
};

interface MarkReadResponse {
  success: true;
  data: { modifiedCount: number; unreadCount: number };
}

export const notificationsApi = {
  list: async (limit = 50) => normalizeList(await apiRequest<RawNotificationListResponse>(`/notifications?page=1&limit=${limit}`)),
  markRead: (notificationIds: string[]) => apiRequest<MarkReadResponse>("/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ notificationIds }),
  }),
  markAllRead: () => apiRequest<MarkReadResponse>("/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ all: true }),
  }),
};
