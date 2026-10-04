import { apiRequest } from "./client";

export type AnnouncementType = "normal" | "important";
export type AnnouncementStatus = "draft" | "published";

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType | string;
  status: AnnouncementStatus | string;
  displayInBanner: boolean;
  bannerLink?: string | null;
  bannerStartsAt?: string | null;
  bannerEndsAt?: string | null;
  bannerDismissible?: boolean;
  publishedAt?: string | null;
  createdAt?: string;
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  type: AnnouncementType;
  targetAudience: ["students", "parents", "teachers"];
  displayInBanner: boolean;
  bannerLink?: string;
  bannerStartsAt?: string;
  bannerEndsAt?: string;
  bannerDismissible: boolean;
}

export const announcementsApi = {
  activeBanner: () => apiRequest<{ success: true; data: AnnouncementItem | null }>("/announcements/banner"),
  list: () => apiRequest<{ success: true; data: AnnouncementItem[] }>("/announcements"),
  create: (payload: AnnouncementPayload) => apiRequest<{ success: true; data: AnnouncementItem }>("/announcements", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<AnnouncementPayload>) => apiRequest<{ success: true; data: AnnouncementItem }>(`/announcements/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  publish: (id: string) => apiRequest<{ success: true; data: AnnouncementItem }>(`/announcements/${encodeURIComponent(id)}/publish`, { method: "PATCH" }),
  remove: (id: string) => apiRequest<void>(`/announcements/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
