import { apiRequest } from "./client";

export type AdminNotificationAudience = "all" | "student" | "teacher" | "parent";
export type AdminNotificationStatus = "processing" | "completed" | "partial" | "failed";

export interface AdminNotificationHistoryItem {
  broadcastId: string;
  title: string;
  content: string;
  image: string | null;
  audience: AdminNotificationAudience | string;
  status: AdminNotificationStatus | string;
  usersTargeted: number;
  notificationsCreated: number;
  tokensTargeted: number;
  pushSuccessCount: number;
  pushFailureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationHistoryPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AdminNotificationHistoryFilters {
  page?: number;
  limit?: number;
  audience?: AdminNotificationAudience;
  status?: AdminNotificationStatus;
  from?: string;
  to?: string;
}

interface AdminNotificationHistoryResponse {
  success: true;
  results: number;
  data: AdminNotificationHistoryItem[];
  pagination: AdminNotificationHistoryPagination;
}

const queryString = (filters: AdminNotificationHistoryFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
};

export const adminNotificationHistoryApi = {
  list: (filters: AdminNotificationHistoryFilters = {}) => {
    const query = queryString(filters);
    return apiRequest<AdminNotificationHistoryResponse>(
      `/admin/notifications/history${query ? `?${query}` : ""}`,
    );
  },
};
